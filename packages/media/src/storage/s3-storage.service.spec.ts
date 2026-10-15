import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
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
    it('uploads the buffer under its path, with its content type and the configured ACL', async () => {
        const body = Buffer.from('png');

        await aStorage({ acl: 'public-read' }).put({
            path: 'user.avatar/u1/original.png',
            buffer: body,
            contentType: 'image/png',
        });

        assert.deepEqual(sent(PutObjectCommand), [
            {
                Bucket: 'atlas-media',
                Key: 'user.avatar/u1/original.png',
                Body: body,
                ContentType: 'image/png',
                ACL: 'public-read',
            },
        ]);
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

    it('deletes the keys of a page in one request, skipping entries without a key', async () => {
        listing({ Contents: [{}, { Key: 'p/1' }, { Key: 'p/2' }] });

        await aStorage().deletePrefix({ prefix: 'p' });

        assert.deepEqual(sent(DeleteObjectsCommand), [
            {
                Bucket: 'atlas-media',
                Delete: { Objects: [{ Key: 'p/1' }, { Key: 'p/2' }] },
            },
        ]);
    });

    // DeleteObjects answers 200 and lists the keys it kept in Errors
    it('fails at the first page S3 could not delete, naming each key', async () => {
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
            /Failed to delete p\/1 \(AccessDenied\)$/,
        );
        assert.equal(sent(ListObjectsV2Command).length, 1);
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
