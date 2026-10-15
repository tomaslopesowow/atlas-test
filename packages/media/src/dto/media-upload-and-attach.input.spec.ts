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

    it('rejects a modelId that is not a whole number', async () => {
        assert.deepEqual(await invalidFields(aBody({ modelId: '4.2' })), [
            'modelId',
        ]);
        assert.deepEqual(await invalidFields(aBody({ modelId: 'abc' })), [
            'modelId',
        ]);
    });

    it('rejects a modelId past what the integer column holds', async () => {
        assert.deepEqual(
            await invalidFields(aBody({ modelId: '2147483648' })),
            ['modelId'],
        );
        assert.deepEqual(
            await invalidFields(aBody({ modelId: '2147483647' })),
            [],
        );
    });

    it('requires every field', async () => {
        assert.deepEqual(await invalidFields({}), [
            'collection',
            'modelId',
            'modelType',
        ]);
    });

    it('rejects an empty modelId instead of reading it as 0', async () => {
        assert.deepEqual(
            await invalidFields(aBody({ modelId: '' })),
            ['modelId'],
            "Number('') is 0, which @IsInt() accepts",
        );
    });

    it('rejects a modelId no row can have', async () => {
        assert.deepEqual(await invalidFields(aBody({ modelId: '0' })), [
            'modelId',
        ]);
        assert.deepEqual(await invalidFields(aBody({ modelId: '-3' })), [
            'modelId',
        ]);
    });
});
