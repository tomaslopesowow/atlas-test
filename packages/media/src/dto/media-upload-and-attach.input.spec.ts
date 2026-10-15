import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MediaUploadAndAttachInput } from './media-upload-and-attach.input.js';

/** A multipart body, where every field arrives as a string. */
const aBody = (overrides: Record<string, unknown> = {}) => ({
    modelType: 'user',
    modelId: '42',
    collection: 'avatar',
    ...overrides,
});

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(MediaUploadAndAttachInput, body)))
        .map(({ property }) => property)
        .sort();

describe('MediaUploadAndAttachInput', () => {
    it('reads a multipart modelId as a number', async () => {
        assert.equal(
            plainToInstance(MediaUploadAndAttachInput, aBody()).modelId,
            42,
        );
        assert.deepEqual(await invalidFields(aBody()), []);
    });

    it('rejects an empty modelId instead of reading it as 0', async () => {
        assert.deepEqual(
            await invalidFields(aBody({ modelId: '' })),
            ['modelId'],
            "Number('') is 0, which @IsInt() accepts",
        );
    });
});
