import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MediaModelQuery } from './media-model.query.js';

const invalidFields = async (query: object) =>
    (await validate(plainToInstance(MediaModelQuery, query)))
        .map(({ property }) => property)
        .sort();

describe('MediaModelQuery', () => {
    it('reads the modelId of a query string as a number, the collection being optional', async () => {
        const query = { modelType: 'user', modelId: '5' };

        assert.equal(plainToInstance(MediaModelQuery, query).modelId, 5);
        assert.deepEqual(await invalidFields(query), []);
        assert.deepEqual(
            await invalidFields({ ...query, collection: 'avatar' }),
            [],
        );
    });
});
