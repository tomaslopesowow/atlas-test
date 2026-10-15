import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    HasPermission,
    HasRole,
    PERMISSIONS_KEY,
    ROLES_KEY,
} from './rbac.decorator.js';

class Posts {
    @HasRole('admin', 'editor')
    edit() {}

    @HasPermission('read:posts', 'update:posts')
    update() {}
}

describe('HasRole', () => {
    it('declares the roles a handler accepts', () => {
        assert.deepEqual(Reflect.getMetadata(ROLES_KEY, Posts.prototype.edit), [
            'admin',
            'editor',
        ]);
    });

    it('refuses an empty list, which would replace the controller roles and leave the route public', () => {
        assert.throws(() => HasRole(), /@HasRole\(\) needs at least one/);
    });
});

describe('HasPermission', () => {
    it('declares the permissions a handler needs', () => {
        assert.deepEqual(
            Reflect.getMetadata(PERMISSIONS_KEY, Posts.prototype.update),
            ['read:posts', 'update:posts'],
        );
    });

    it('refuses an empty list, which would replace the controller permissions and leave the route public', () => {
        assert.throws(
            () => HasPermission(),
            /@HasPermission\(\) needs at least one/,
        );
    });
});
