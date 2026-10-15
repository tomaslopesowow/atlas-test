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

    it('reads the pixel limit as a number, refusing one that is not a positive whole number', () => {
        assert.equal(
            mediaConfig({ STORAGE_MAX_IMAGE_PIXELS: '1000' }).maxImagePixels,
            1000,
        );

        for (const pixels of ['abc', '0', '1.5'])
            assert.throws(
                () => mediaConfig({ STORAGE_MAX_IMAGE_PIXELS: pixels }),
                /STORAGE_MAX_IMAGE_PIXELS/,
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

    it('needs no S3 variables on the local disk', () => {
        assert.doesNotThrow(() => mediaConfig({ STORAGE_DISK: 'local' }));
    });

    // every S3 variable shares the one decorator; each one's absence is covered below
    it('needs the S3 variables on S3, counting an empty one as missing', () => {
        const { S3_BUCKET: _, ...missing } = s3Env;

        assert.throws(() => mediaConfig(missing), /S3_BUCKET must be a string/);
        assert.throws(
            () => mediaConfig({ ...s3Env, S3_BUCKET: '' }),
            /S3_BUCKET should not be empty/,
        );
    });

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
