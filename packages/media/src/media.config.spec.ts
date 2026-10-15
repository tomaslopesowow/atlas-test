import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mediaConfig } from './media.config.js';

const s3Env = {
    STORAGE_DISK: 's3',
    S3_BUCKET: 'atlas-media',
    S3_ENDPOINT: 'https://ams3.digitaloceanspaces.com',
    S3_ACCESS_KEY_ID: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
    S3_REGION: 'ams3',
};

describe('mediaConfig', () => {
    it('registers under the media namespace', () => {
        assert.equal(mediaConfig.KEY, 'CONFIGURATION(media)');
    });

    it('stores up to 5 MB of jpeg, png or webp on the local disk by default', () => {
        assert.deepEqual(mediaConfig({}), {
            disk: 'local',
            maxFileSize: 5 * 1024 * 1024,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            local: { path: './uploads' },
            s3: {
                bucket: undefined,
                endpoint: undefined,
                key: undefined,
                secret: undefined,
                region: undefined,
                cdnUrl: undefined,
                acl: undefined,
            },
        });
    });

    it('groups the S3 variables', () => {
        assert.deepEqual(
            mediaConfig({
                ...s3Env,
                S3_CDN_URL: 'https://cdn.example.test',
                S3_ACL: 'public-read',
            }).s3,
            {
                bucket: 'atlas-media',
                endpoint: 'https://ams3.digitaloceanspaces.com',
                key: 'access-key',
                secret: 'secret-key',
                region: 'ams3',
                cdnUrl: 'https://cdn.example.test',
                acl: 'public-read',
            },
        );
    });

    it('sets no ACL when S3_ACL is unset or empty, leaving access to the bucket policy', () => {
        assert.equal(mediaConfig(s3Env).s3.acl, undefined);
        assert.equal(mediaConfig({ ...s3Env, S3_ACL: '' }).s3.acl, undefined);
    });

    it('refuses an ACL S3 does not know, naming the ones it does', () => {
        assert.throws(
            () => mediaConfig({ ...s3Env, S3_ACL: 'public' }),
            /S3_ACL must be one of the following values: .*public-read/,
        );
    });

    it('reads the size limit as a number', () => {
        assert.equal(
            mediaConfig({ STORAGE_MAX_FILE_SIZE: '1024' }).maxFileSize,
            1024,
        );
    });

    it('reads the mime types as a comma-separated list', () => {
        assert.deepEqual(
            mediaConfig({
                STORAGE_ALLOWED_MIME_TYPES: ' image/png, ,image/gif ',
            }).allowedMimeTypes,
            ['image/png', 'image/gif'],
        );
    });

    it('normalises the mime types as an upload is, so the pipe compares like with like', () => {
        assert.deepEqual(
            mediaConfig({
                STORAGE_ALLOWED_MIME_TYPES:
                    'IMAGE/PNG,image/svg+xml; charset=utf-8',
            }).allowedMimeTypes,
            ['image/png', 'image/svg+xml'],
        );
    });

    it('refuses an empty mime type list, which would reject every upload', () => {
        assert.throws(
            () => mediaConfig({ STORAGE_ALLOWED_MIME_TYPES: '' }),
            /STORAGE_ALLOWED_MIME_TYPES should not be empty/,
        );
    });

    it('refuses a disk it does not know', () => {
        assert.throws(
            () => mediaConfig({ STORAGE_DISK: 'S3' }),
            /STORAGE_DISK must be one of the following values: local, s3/,
        );
    });

    it('refuses a size limit that is not a positive whole number', () => {
        for (const size of ['abc', '0', '1.5', ''])
            assert.throws(
                () => mediaConfig({ STORAGE_MAX_FILE_SIZE: size }),
                /STORAGE_MAX_FILE_SIZE/,
            );
    });

    it('needs no S3 variables on the local disk', () => {
        assert.doesNotThrow(() => mediaConfig({ STORAGE_DISK: 'local' }));
    });

    for (const name of [
        'S3_BUCKET',
        'S3_ENDPOINT',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'S3_REGION',
    ] as const) {
        it(`needs ${name} on S3, counting an empty one as missing`, () => {
            const { [name]: _, ...missing } = s3Env;

            assert.throws(
                () => mediaConfig(missing),
                new RegExp(`${name} must be a string`),
            );
            assert.throws(
                () => mediaConfig({ ...s3Env, [name]: '' }),
                new RegExp(`${name} should not be empty`),
            );
        });
    }

    it('reports every problem at once', () => {
        assert.throws(
            () =>
                mediaConfig({ STORAGE_DISK: 's3', STORAGE_MAX_FILE_SIZE: '0' }),
            (error: Error) =>
                [
                    'STORAGE_MAX_FILE_SIZE',
                    'S3_BUCKET',
                    'S3_ENDPOINT',
                    'S3_ACCESS_KEY_ID',
                    'S3_SECRET_ACCESS_KEY',
                    'S3_REGION',
                ].every((name) => error.message.includes(name)),
        );
    });
});
