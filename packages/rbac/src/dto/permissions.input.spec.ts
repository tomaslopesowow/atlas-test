import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PermissionsInput } from './permissions.input.js';

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(PermissionsInput, body)))
        .map(({ property }) => property)
        .sort();

describe('PermissionsInput', () => {
    it('accepts a list of permission names', async () => {
        assert.deepEqual(
            await invalidFields({ names: ['read:posts', 'update:posts'] }),
            [],
        );
    });

    it('requires the names', async () => {
        assert.deepEqual(await invalidFields({}), ['names']);
    });

    it('rejects names that are not a list', async () => {
        assert.deepEqual(await invalidFields({ names: 'read:posts' }), [
            'names',
        ]);
    });

    it('rejects a name that is not a string', async () => {
        assert.deepEqual(await invalidFields({ names: ['read:posts', 42] }), [
            'names',
        ]);
    });
});
