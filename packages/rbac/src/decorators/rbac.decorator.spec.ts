import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HasPermission, HasRole } from './rbac.decorator.js';

describe('HasRole', () => {
    it('refuses an empty list, which would replace the controller roles and leave the route public', () => {
        assert.throws(() => HasRole(), /@HasRole\(\) needs at least one/);
    });
});

describe('HasPermission', () => {
    it('refuses an empty list, which would replace the controller permissions and leave the route public', () => {
        assert.throws(
            () => HasPermission(),
            /@HasPermission\(\) needs at least one/,
        );
    });
});
