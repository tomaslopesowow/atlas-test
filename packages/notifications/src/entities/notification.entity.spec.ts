import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { NotificationEntity } from './notification.entity.js';

const column = (propertyName: string) =>
    getMetadataArgsStorage().columns.find(
        (column) =>
            column.target === NotificationEntity &&
            column.propertyName === propertyName,
    );

const aNotification = (overrides: Partial<NotificationEntity> = {}) =>
    Object.assign(new NotificationEntity(), {
        modelType: 'user',
        modelId: 5,
        ...overrides,
    });

describe('NotificationEntity', () => {
    it('indexes the inbox by owner, then id, so it pages newest first from the index alone', () => {
        const index = getMetadataArgsStorage().indices.find(
            ({ target }) => target === NotificationEntity,
        );

        assert.deepEqual(index?.columns, ['modelType', 'modelId', 'id']);
        assert.equal(index?.where, '"inbox"');
    });

    it('takes its uuid primary key from the service rather than the database', () => {
        assert.equal(column('id')?.mode, 'regular');
        assert.equal(column('id')?.options.primary, true);
        assert.equal(column('id')?.options.type, 'uuid');
        assert.equal(
            getMetadataArgsStorage().generations.some(
                ({ target }) => target === NotificationEntity,
            ),
            false,
        );
    });

    it('starts out of the inbox, with no deliveries', () => {
        assert.equal(column('inbox')?.options.default, false);
        assert.deepEqual(column('deliveries')?.options.default, {});
    });
});

describe('NotificationEntity.owner', () => {
    it('is the model the notification belongs to', () => {
        assert.deepEqual(aNotification().owner, {
            modelType: 'user',
            modelId: 5,
        });
    });

    it('is undefined for a notification sent by address alone', () => {
        assert.equal(
            aNotification({ modelType: null, modelId: null }).owner,
            undefined,
        );
    });

    it('keeps a model whose id is 0', () => {
        assert.deepEqual(aNotification({ modelId: 0 }).owner, {
            modelType: 'user',
            modelId: 0,
        });
    });
});
