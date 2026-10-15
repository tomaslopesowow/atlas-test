import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    NotFound,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import type { MediaConfig } from '../media.config.js';
import { S3StorageService } from './s3-storage.service.js';

type S3Options = MediaConfig['s3'];

const s3: S3Options = {
    region: 'ams3',
    endpoint: 'https://ams3.digitaloceanspaces.com',
    bucket: 'atlas-media',
    key: 'access-key',
    secret: 'secret-key',
    cdnUrl: 'https://cdn.example.test',
    acl: undefined,
};

const aStorage = (overrides: Partial<S3Options> = {}) =>
    new S3StorageService({ ...s3, ...overrides });

// every command reaches the bucket through send(), so faking it fakes the bucket
const fakeSend = () =>
    mock.method(
        S3Client.prototype,
        'send',
        async (_command: unknown): Promise<unknown> => ({}),
    );

let send: ReturnType<typeof fakeSend>;

beforeEach(() => {
    send = fakeSend();
});

afterEach(() => mock.restoreAll());

/** The inputs of every command of one kind that was sent, in order. */
const sent = <T extends { input: object }>(
    type: new (...args: never[]) => T,
): T['input'][] =>
    send.mock.calls
        .map((call) => call.arguments[0])
        .filter((command): command is T => command instanceof type)
        .map(({ input }) => input);

const aBody = (bytes: number[]) => ({
    transformToByteArray: async () => new Uint8Array(bytes),
});

describe('S3StorageService configuration', () => {
    it('connects to the configured endpoint and region with the key and secret', async () => {
        await aStorage().exists({ path: 'a/original.png' });

        const client = send.mock.calls[0]?.this as S3Client;
        const { accessKeyId, secretAccessKey } =
            await client.config.credentials();

        assert.equal(await client.config.region(), 'ams3');
        assert.equal(accessKeyId, 'access-key');
        assert.equal(secretAccessKey, 'secret-key');
        assert.equal(
            (await client.config.endpoint?.())?.hostname,
            'ams3.digitaloceanspaces.com',
        );
        assert.equal(client.config.forcePathStyle, false);
    });

    for (const setting of [
        'region',
        'endpoint',
        'bucket',
        'key',
        'secret',
    ] as const) {
        it(`refuses to start without ${setting}`, () => {
            assert.throws(
                () => aStorage({ [setting]: undefined }),
                /S3 storage needs/,
            );
        });
    }

    it('counts an empty setting, as an unset env var arrives, as missing', () => {
        assert.throws(() => aStorage({ bucket: '' }), /S3 storage needs/);
    });
});

describe('S3StorageService.put', () => {
    it('uploads the buffer under its path', async () => {
        const body = Buffer.from('png');

        await aStorage().put({
            path: 'user.avatar/u1/original.png',
            buffer: body,
        });

        assert.equal(sent(PutObjectCommand).length, 1);
        assert.partialDeepStrictEqual(sent(PutObjectCommand)[0], {
            Bucket: 'atlas-media',
            Key: 'user.avatar/u1/original.png',
            Body: body,
        });
    });

    it('sends no ACL unless one is configured, so a bucket that refuses ACLs still accepts it', async () => {
        await aStorage().put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        assert.equal(sent(PutObjectCommand)[0]?.ACL, undefined);
    });

    it('uploads with the configured ACL', async () => {
        await aStorage({ acl: 'public-read' }).put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        assert.equal(sent(PutObjectCommand)[0]?.ACL, 'public-read');
    });

    it('stores the content type it is given, so a browser shows the file instead of downloading it', async () => {
        await aStorage().put({
            path: 'user.avatar/u1/original.png',
            buffer: Buffer.from('png'),
            contentType: 'image/png',
        });

        assert.equal(sent(PutObjectCommand)[0]?.ContentType, 'image/png');
    });

    it('propagates a failed upload', async () => {
        const failure = new Error('SlowDown');
        send.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            aStorage().put({
                path: 'a/original.png',
                buffer: Buffer.from('png'),
            }),
            failure,
        );
    });
});

describe('S3StorageService.get', () => {
    it('returns the object body as a buffer', async () => {
        send.mock.mockImplementation(async () => ({ Body: aBody([1, 2, 3]) }));

        const file = await aStorage().get({ path: 'a/original.png' });

        assert.ok(Buffer.isBuffer(file));
        assert.deepEqual(file, Buffer.from([1, 2, 3]));
        assert.deepEqual(sent(GetObjectCommand), [
            { Bucket: 'atlas-media', Key: 'a/original.png' },
        ]);
    });

    it('rejects an object without a body', async () => {
        send.mock.mockImplementation(async () => ({}));

        await assert.rejects(
            aStorage().get({ path: 'a/original.png' }),
            /Failed to retrieve file: a\/original\.png/,
        );
    });

    it('propagates a failed download', async () => {
        const failure = new Error('NoSuchKey');
        send.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            aStorage().get({ path: 'a/original.png' }),
            failure,
        );
    });
});

describe('S3StorageService.delete', () => {
    it('deletes every key in one request', async () => {
        await aStorage().delete({ paths: ['a/one.png', 'b/two.png'] });

        assert.deepEqual(sent(DeleteObjectsCommand), [
            {
                Bucket: 'atlas-media',
                Delete: {
                    Objects: [{ Key: 'a/one.png' }, { Key: 'b/two.png' }],
                },
            },
        ]);
    });

    it('splits more keys than one request takes into batches of 1000', async () => {
        const paths = Array.from({ length: 2_001 }, (_, i) => `p/${i}`);

        await aStorage().delete({ paths });

        assert.deepEqual(
            sent(DeleteObjectsCommand).map(
                ({ Delete }) => Delete?.Objects?.length,
            ),
            [1_000, 1_000, 1],
        );
    });

    it('sends nothing for an empty list', async () => {
        await aStorage().delete({ paths: [] });

        assert.equal(send.mock.callCount(), 0);
    });

    it('fails, naming each key, when S3 could not delete some of them', async () => {
        // DeleteObjects answers 200 and lists the keys it kept in Errors
        send.mock.mockImplementation(async () => ({
            Deleted: [{ Key: 'p/2' }],
            Errors: [{ Key: 'p/1', Code: 'AccessDenied', Message: 'Denied' }],
        }));

        await assert.rejects(
            aStorage().delete({ paths: ['p/1', 'p/2'] }),
            /Failed to delete p\/1 \(AccessDenied\)$/,
        );
    });
});

describe('S3StorageService.deletePrefix', () => {
    /** Answers each listing with the next page, and every other command with {}. */
    const listing = (...pages: object[]) =>
        send.mock.mockImplementation(async (command: unknown) =>
            command instanceof ListObjectsV2Command
                ? (pages.shift() ?? {})
                : {},
        );

    it('lists the prefix as a folder, so a sibling with the same leading characters survives', async () => {
        await aStorage().deletePrefix({ prefix: 'user.avatar/u1' });

        assert.equal(sent(ListObjectsV2Command)[0]?.Prefix, 'user.avatar/u1/');
    });

    it('does not double a trailing slash', async () => {
        await aStorage().deletePrefix({ prefix: 'user.avatar/u1/' });

        assert.equal(sent(ListObjectsV2Command)[0]?.Prefix, 'user.avatar/u1/');
    });

    it('deletes every listed key in one request', async () => {
        listing({ Contents: [{ Key: 'p/original.png' }, { Key: 'p/a.webp' }] });

        await aStorage().deletePrefix({ prefix: 'p' });

        assert.deepEqual(sent(DeleteObjectsCommand), [
            {
                Bucket: 'atlas-media',
                Delete: {
                    Objects: [{ Key: 'p/original.png' }, { Key: 'p/a.webp' }],
                },
            },
        ]);
    });

    it('follows the continuation token to the last page', async () => {
        listing(
            {
                Contents: [{ Key: 'p/1' }],
                IsTruncated: true,
                NextContinuationToken: 'page-2',
            },
            { Contents: [{ Key: 'p/2' }], IsTruncated: false },
        );

        await aStorage().deletePrefix({ prefix: 'p' });

        assert.deepEqual(
            sent(ListObjectsV2Command).map(
                ({ ContinuationToken }) => ContinuationToken,
            ),
            [undefined, 'page-2'],
        );
        assert.deepEqual(
            sent(DeleteObjectsCommand).map(({ Delete }) => Delete?.Objects),
            [[{ Key: 'p/1' }], [{ Key: 'p/2' }]],
        );
    });

    it('stops at a truncated page that carries no continuation token', async () => {
        listing({ Contents: [{ Key: 'p/1' }], IsTruncated: true });

        await aStorage().deletePrefix({ prefix: 'p' });

        assert.equal(sent(ListObjectsV2Command).length, 1);
    });

    it('sends no delete for an empty listing', async () => {
        listing({ KeyCount: 0 });

        await aStorage().deletePrefix({ prefix: 'p' });

        assert.equal(sent(DeleteObjectsCommand).length, 0);
    });

    it('skips listed entries without a key', async () => {
        listing({ Contents: [{}, { Key: 'p/1' }] });

        await aStorage().deletePrefix({ prefix: 'p' });

        assert.deepEqual(sent(DeleteObjectsCommand)[0]?.Delete?.Objects, [
            { Key: 'p/1' },
        ]);
    });

    it('stops at the first page S3 could not delete', async () => {
        send.mock.mockImplementation(async (command: unknown) => {
            if (command instanceof ListObjectsV2Command)
                return {
                    Contents: [{ Key: 'p/1' }],
                    IsTruncated: true,
                    NextContinuationToken: 'page-2',
                };
            return { Errors: [{ Key: 'p/1', Code: 'AccessDenied' }] };
        });

        await assert.rejects(
            aStorage().deletePrefix({ prefix: 'p' }),
            /Failed to delete p\/1/,
        );
        assert.equal(sent(ListObjectsV2Command).length, 1);
    });
});

describe('S3StorageService.exists', () => {
    it('is true when the object can be read', async () => {
        assert.equal(await aStorage().exists({ path: 'a/original.png' }), true);
        assert.deepEqual(sent(HeadObjectCommand), [
            { Bucket: 'atlas-media', Key: 'a/original.png' },
        ]);
    });

    it('is false when S3 answers 404', async () => {
        send.mock.mockImplementation(async () => {
            throw new NotFound({
                message: 'NotFound',
                $metadata: { httpStatusCode: 404 },
            });
        });

        assert.equal(
            await aStorage().exists({ path: 'a/original.png' }),
            false,
        );
    });

    it('rejects any other failure, rather than calling the file missing', async () => {
        const failure = new Error('ECONNRESET');
        send.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            aStorage().exists({ path: 'a/original.png' }),
            failure,
        );
    });
});

describe('S3StorageService.url', () => {
    it('serves from the CDN when one is configured', () => {
        assert.equal(
            aStorage().url({ path: 'user.avatar/u1/original.png' }),
            'https://cdn.example.test/user.avatar/u1/original.png',
        );
    });

    it('falls back to the bucket on the endpoint', () => {
        assert.equal(
            aStorage({ cdnUrl: undefined }).url({ path: 'a/original.png' }),
            'https://ams3.digitaloceanspaces.com/atlas-media/a/original.png',
        );
    });

    it('treats an empty CDN url, as an unset env var arrives, as unset', () => {
        assert.equal(
            aStorage({ cdnUrl: '' }).url({ path: 'a/original.png' }),
            'https://ams3.digitaloceanspaces.com/atlas-media/a/original.png',
        );
    });

    it('does not double the slash after a CDN url that ends in one', () => {
        assert.equal(
            aStorage({ cdnUrl: 'https://cdn.example.test/' }).url({
                path: 'a/original.png',
            }),
            'https://cdn.example.test/a/original.png',
        );
    });

    it('does not double the slash after an endpoint that ends in one', () => {
        assert.equal(
            aStorage({
                endpoint: 'https://ams3.digitaloceanspaces.com/',
                cdnUrl: undefined,
            }).url({ path: 'a/original.png' }),
            'https://ams3.digitaloceanspaces.com/atlas-media/a/original.png',
        );
    });
});
