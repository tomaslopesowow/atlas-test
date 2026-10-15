import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MediaAttachmentInput } from './media-attachment.input.js';

const aBody = (overrides: Record<string, unknown> = {}) => ({
    mediaId: '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f',
    modelType: 'user',
    modelId: 5,
    ...overrides,
});

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(MediaAttachmentInput, body)))
        .map(({ property }) => property)
        .sort();

describe('MediaAttachmentInput', () => {
    it('accepts a media id, a model type and an integer model id', async () => {
        assert.deepEqual(await invalidFields(aBody()), []);
    });

    it('rejects a media id that is not a UUIDv7, the version the service makes', async () => {
        for (const mediaId of [3, '3', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'])
            assert.deepEqual(
                await invalidFields(aBody({ mediaId })),
                ['mediaId'],
                String(mediaId),
            );
    });

    it('rejects a model id sent as a string, since a JSON body is not converted', async () => {
        assert.deepEqual(await invalidFields(aBody({ modelId: '5' })), [
            'modelId',
        ]);
    });

    it('rejects a model id no row can have', async () => {
        for (const modelId of [1.5, 0, -1, 2_147_483_648])
            assert.deepEqual(
                await invalidFields(aBody({ modelId })),
                ['modelId'],
                String(modelId),
            );
    });

    it('requires every field', async () => {
        assert.deepEqual(await invalidFields({}), [
            'mediaId',
            'modelId',
            'modelType',
        ]);
    });
});
