import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { DeviceEntity } from './device.entity.js';

describe('DeviceEntity', () => {
    it('keeps each token on one device, so it moves to whoever registered it last', () => {
        const token = getMetadataArgsStorage().columns.find(
            ({ target, propertyName }) =>
                target === DeviceEntity && propertyName === 'token',
        );

        assert.equal(token?.options.unique, true);
    });

    it("indexes the devices by owner, for looking up a recipient's tokens", () => {
        const index = getMetadataArgsStorage().indices.find(
            ({ target }) => target === DeviceEntity,
        );

        assert.deepEqual(index?.columns, ['modelType', 'modelId']);
    });
});
