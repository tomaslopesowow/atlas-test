import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDeviceInput } from './register-device.input.js';

const token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

const invalidFields = async (body: object) =>
    (await validate(plainToInstance(RegisterDeviceInput, body)))
        .map(({ property }) => property)
        .sort();

describe('RegisterDeviceInput', () => {
    it('accepts a token, with or without the provider that issued it', async () => {
        assert.deepEqual(await invalidFields({ token }), []);
        assert.deepEqual(await invalidFields({ token, provider: 'expo' }), []);
    });

    it('requires a token', async () => {
        for (const body of [{}, { token: '' }, { token: 5 }])
            assert.deepEqual(
                await invalidFields(body),
                ['token'],
                JSON.stringify(body),
            );
    });

    it('rejects a provider that is not a string', async () => {
        assert.deepEqual(await invalidFields({ token, provider: 5 }), [
            'provider',
        ]);
    });

    it('rejects an empty provider, which would not fall back to the default', async () => {
        assert.deepEqual(await invalidFields({ token, provider: '' }), [
            'provider',
        ]);
    });
});
