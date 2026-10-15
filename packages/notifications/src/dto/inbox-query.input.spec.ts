import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InboxQueryInput } from './inbox-query.input.js';

const v7 = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';

const invalidFields = async (query: object) =>
    (await validate(plainToInstance(InboxQueryInput, query)))
        .map(({ property }) => property)
        .sort();

describe('InboxQueryInput', () => {
    it('needs nothing, for the newest page', async () => {
        assert.deepEqual(await invalidFields({}), []);
    });

    it('accepts the last id of the previous page', async () => {
        assert.deepEqual(await invalidFields({ after: v7 }), []);
    });

    it('rejects an after that is not a UUIDv7, the version the service makes', async () => {
        for (const after of ['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'abc'])
            assert.deepEqual(await invalidFields({ after }), ['after'], after);
    });

    it('reads the limit from the query string as a number', () => {
        assert.equal(
            plainToInstance(InboxQueryInput, { limit: '20' }).limit,
            20,
        );
    });

    it('accepts a whole number limit from 1 to 100', async () => {
        for (const limit of ['1', '100'])
            assert.deepEqual(await invalidFields({ limit }), [], limit);

        for (const limit of ['0', '101', '1.5', 'abc'])
            assert.deepEqual(await invalidFields({ limit }), ['limit'], limit);
    });
});
