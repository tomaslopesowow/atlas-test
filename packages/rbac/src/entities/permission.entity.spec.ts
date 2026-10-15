import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { PermissionEntity } from './permission.entity.js';

describe('PermissionEntity.name', () => {
    it('is unique, so roles that share a permission share its row', () => {
        const column = getMetadataArgsStorage().columns.find(
            (column) =>
                column.target === PermissionEntity &&
                column.propertyName === 'name',
        );

        assert.equal(column?.options.unique, true);
    });

    it('is normalised by RbacService alone, since its query-builder inserts skip entity listeners', () => {
        const listeners = getMetadataArgsStorage().entityListeners.filter(
            ({ target }) => target === PermissionEntity,
        );

        assert.deepEqual(listeners, []);
    });
});
