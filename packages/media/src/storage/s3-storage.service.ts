import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import type { MediaConfig } from '../media.config.js';
import type {
    IStorageService,
    StoragePathInput,
    StoragePrefixInput,
    StoragePutInput,
} from './storage.interface.js';

// so a hung call cannot hold up the conversion sweep, and shutdown with it, for good
const CONNECTION_TIMEOUT_MS = 5_000;
const REQUEST_TIMEOUT_MS = 30_000;

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export class S3StorageService implements IStorageService {
    readonly disk = 's3';
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly baseUrl: string;
    private readonly acl: MediaConfig['s3']['acl'];

    constructor({
        region,
        endpoint,
        key,
        secret,
        bucket,
        cdnUrl,
        acl,
    }: MediaConfig['s3']) {
        if (!region || !endpoint || !key || !secret || !bucket)
            throw new Error(
                'S3 storage needs media.s3.region, endpoint, bucket, key and secret',
            );

        this.bucket = bucket;
        this.acl = acl;
        // an unset env var arrives as '', which must fall back as well
        this.baseUrl = withoutTrailingSlash(
            cdnUrl || `${withoutTrailingSlash(endpoint)}/${bucket}`,
        );
        this.client = new S3Client({
            region,
            endpoint,
            credentials: { accessKeyId: key, secretAccessKey: secret },
            // DigitalOcean Spaces addresses buckets virtual-hosted style
            forcePathStyle: false,
            requestHandler: {
                connectionTimeout: CONNECTION_TIMEOUT_MS,
                requestTimeout: REQUEST_TIMEOUT_MS,
                // or a request over the timeout is only logged, and carries on
                throwOnRequestTimeout: true,
            },
        });
    }

    async put({ path, buffer, contentType }: StoragePutInput): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: path,
                Body: buffer,
                ContentType: contentType,
                ACL: this.acl,
            }),
        );
    }

    async get({ path }: StoragePathInput): Promise<Buffer> {
        const { Body } = await this.client.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: path }),
        );

        if (!Body) throw new Error(`Failed to retrieve file: ${path}`);

        return Buffer.from(await Body.transformToByteArray());
    }

    async deletePrefix({ prefix }: StoragePrefixInput): Promise<void> {
        // the trailing slash keeps a sibling with the same leading characters safe
        const Prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
        let ContinuationToken: string | undefined;

        do {
            const listed = await this.client.send(
                new ListObjectsV2Command({
                    Bucket: this.bucket,
                    Prefix,
                    ContinuationToken,
                }),
            );

            // a page lists at most 1000 keys, as many as one DeleteObjects takes
            await this.delete({
                paths: listed.Contents?.flatMap(({ Key }) => Key ?? []) ?? [],
            });

            ContinuationToken = listed.IsTruncated
                ? listed.NextContinuationToken
                : undefined;
        } while (ContinuationToken);
    }

    url({ path }: StoragePathInput): string {
        return `${this.baseUrl}/${path}`;
    }

    private async delete({ paths }: { paths: string[] }): Promise<void> {
        if (!paths.length) return;

        const { Errors } = await this.client.send(
            new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: { Objects: paths.map((Key) => ({ Key })) },
            }),
        );

        // a 200 can still list keys S3 refused to delete
        if (Errors?.length)
            throw new Error(
                `Failed to delete ${Errors.map(({ Key, Code }) => `${Key} (${Code})`).join(', ')}`,
            );
    }
}
