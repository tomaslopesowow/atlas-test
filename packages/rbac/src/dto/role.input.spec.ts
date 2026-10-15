import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RoleInput } from './role.input.js';

const aBody = (overrides: Record<string, unknown> = {}) => ({
    name: 'editor',
    permissions: ['read:posts', 'update:posts'],
    ...overrides,
});

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(RoleInput, body)))
        .map(({ property }) => property)
        .sort();

describe('RoleInput', () => {
    it('accepts a role with permission names', async () => {
        assert.deepEqual(await invalidFields(aBody()), []);
    });

    it('accepts a role without permissions', async () => {
        assert.deepEqual(await invalidFields({ name: 'editor' }), []);
    });

    it('rejects a permission that is not a name', async () => {
        for (const permission of [42, { name: 'read:posts' }])
            assert.deepEqual(
                await invalidFields(
                    aBody({ permissions: ['read:posts', permission] }),
                ),
                ['permissions'],
                JSON.stringify(permission),
            );
    });

    it('rejects permissions that are not a list', async () => {
        assert.deepEqual(
            await invalidFields(aBody({ permissions: 'read:posts' })),
            ['permissions'],
        );
    });

    it('requires a name', async () => {
        assert.deepEqual(await invalidFields({}), ['name']);
    });

    it('rejects an empty name', async () => {
        assert.deepEqual(await invalidFields(aBody({ name: '' })), ['name']);
    });
});
