import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MarkReadInput } from './mark-read.input.js';

const v7 = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';
const v4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(MarkReadInput, body)))
        .map(({ property }) => property)
        .sort();

describe('MarkReadInput', () => {
    it('accepts a list of notification ids', async () => {
        assert.deepEqual(
            await invalidFields({
                ids: [v7, '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e60'],
            }),
            [],
        );
    });

    it('rejects an id that is not a UUIDv7, the version the service makes', async () => {
        for (const id of [v4, 'abc', 5])
            assert.deepEqual(
                await invalidFields({ ids: [v7, id] }),
                ['ids'],
                String(id),
            );
    });

    it('requires the ids as a list', async () => {
        for (const body of [{}, { ids: v7 }])
            assert.deepEqual(
                await invalidFields(body),
                ['ids'],
                JSON.stringify(body),
            );
    });

    it('takes at most 100 ids at once', async () => {
        assert.deepEqual(await invalidFields({ ids: Array(100).fill(v7) }), []);
        assert.deepEqual(await invalidFields({ ids: Array(101).fill(v7) }), [
            'ids',
        ]);
    });
});
