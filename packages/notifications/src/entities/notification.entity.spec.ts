import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotificationEntity } from './notification.entity.js';

const aNotification = (overrides: Partial<NotificationEntity> = {}) =>
    Object.assign(new NotificationEntity(), {
        modelType: 'user',
        modelId: 5,
        ...overrides,
    });

describe('NotificationEntity.owner', () => {
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
