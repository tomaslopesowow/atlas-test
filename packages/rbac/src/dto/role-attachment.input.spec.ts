import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RoleAttachmentInput } from './role-attachment.input.js';

const aBody = (overrides: Record<string, unknown> = {}) => ({
    roleId: 2,
    modelType: 'user',
    modelId: 5,
    ...overrides,
});

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(RoleAttachmentInput, body)))
        .map(({ property }) => property)
        .sort();

describe('RoleAttachmentInput', () => {
    it('accepts integer ids and a model type', async () => {
        assert.deepEqual(await invalidFields(aBody()), []);
    });

    it('rejects ids sent as strings, since a JSON body is not converted', async () => {
        assert.deepEqual(
            await invalidFields(aBody({ roleId: '2', modelId: '5' })),
            ['modelId', 'roleId'],
        );
    });

    it('rejects fractional ids', async () => {
        assert.deepEqual(await invalidFields(aBody({ roleId: 1.5 })), [
            'roleId',
        ]);
    });

    it('rejects ids no row can have', async () => {
        assert.deepEqual(
            await invalidFields(aBody({ roleId: 0, modelId: -1 })),
            ['modelId', 'roleId'],
        );
    });

    it('rejects ids past what an integer column holds', async () => {
        assert.deepEqual(
            await invalidFields(
                aBody({ roleId: 2_147_483_648, modelId: 2_147_483_648 }),
            ),
            ['modelId', 'roleId'],
        );
        assert.deepEqual(
            await invalidFields(
                aBody({ roleId: 2_147_483_647, modelId: 2_147_483_647 }),
            ),
            [],
        );
    });

    it('requires every field', async () => {
        assert.deepEqual(await invalidFields({}), [
            'modelId',
            'modelType',
            'roleId',
        ]);
    });
});
