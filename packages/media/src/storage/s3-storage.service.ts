import {
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import type { MediaConfig } from '../media.config.js';
import type {
    IStorageService,
    StoragePathInput,
    StoragePathsInput,
    StoragePrefixInput,
    StoragePutInput,
} from './storage.interface.js';

// the most keys one DeleteObjects request takes
const DELETE_BATCH = 1_000;

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

    async delete({ paths }: StoragePathsInput): Promise<void> {
        for (let start = 0; start < paths.length; start += DELETE_BATCH) {
            const { Errors } = await this.client.send(
                new DeleteObjectsCommand({
                    Bucket: this.bucket,
                    Delete: {
                        Objects: paths
                            .slice(start, start + DELETE_BATCH)
                            .map((Key) => ({ Key })),
                    },
                }),
            );

            // a 200 can still list keys S3 refused to delete
            if (Errors?.length)
                throw new Error(
                    `Failed to delete ${Errors.map(({ Key, Code }) => `${Key} (${Code})`).join(', ')}`,
                );
        }
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

            await this.delete({
                paths: listed.Contents?.flatMap(({ Key }) => Key ?? []) ?? [],
            });

            ContinuationToken = listed.IsTruncated
                ? listed.NextContinuationToken
                : undefined;
        } while (ContinuationToken);
    }

    async exists({ path }: StoragePathInput): Promise<boolean> {
        try {
            await this.client.send(
                new HeadObjectCommand({ Bucket: this.bucket, Key: path }),
            );

            return true;
        } catch (error) {
            if (
                error instanceof S3ServiceException &&
                error.$metadata.httpStatusCode === 404
            )
                return false;

            throw error;
        }
    }

    url({ path }: StoragePathInput): string {
        return `${this.baseUrl}/${path}`;
    }
}
