import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HasPermission, HasRole } from '../decorators/rbac.decorator.js';
import type { RbacService } from '../rbac.service.js';
import type { RbacSubject, SubjectCheckInput } from '../types/types.js';
import { RbacGuard } from './rbac.guard.js';

class Posts {
    index() {}

    @HasPermission('read:posts')
    read() {}
}

@HasRole('admin')
class Admin {
    list() {}

    @HasRole('editor')
    edit() {}

    @HasPermission('delete:posts')
    remove() {}
}

const user: RbacSubject = { modelType: 'user', modelId: 5 };

const contextFor = (controller: { prototype: object }, handler: string) =>
    ({
        getClass: () => controller,
        getHandler: () => Reflect.get(controller.prototype, handler),
    }) as unknown as ExecutionContext;

/** What the subject holds, as the stubbed service answers for it. */
const grants = { roles: [] as string[], permissions: [] as string[] };

const rbacService = {
    hasAnyRole: mock.fn(async ({ names }: SubjectCheckInput) =>
        names.some((name) => grants.roles.includes(name)),
    ),
    hasAllPermissions: mock.fn(async ({ names }: SubjectCheckInput) =>
        names.every((name) => grants.permissions.includes(name)),
    ),
};

const getSubject = mock.fn(
    async (_context: ExecutionContext): Promise<RbacSubject | undefined> =>
        user,
);

class SessionGuard extends RbacGuard {
    protected getSubject(context: ExecutionContext) {
        return getSubject(context);
    }
}

const lastCall = (fn: {
    mock: { calls: readonly { arguments: readonly unknown[] }[] };
}) => fn.mock.calls.at(-1)?.arguments;

let guard: SessionGuard;

beforeEach(() => {
    grants.roles = [];
    grants.permissions = [];
    for (const fn of [
        rbacService.hasAnyRole,
        rbacService.hasAllPermissions,
        getSubject,
    ]) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }

    guard = new SessionGuard(
        new Reflector(),
        rbacService as unknown as RbacService,
    );
});

describe('RbacGuard', () => {
    it('lets a handler without requirements through, without resolving a subject', async () => {
        assert.equal(await guard.canActivate(contextFor(Posts, 'index')), true);
        assert.equal(
            getSubject.mock.callCount(),
            0,
            'a public route must not need a signed-in subject',
        );
    });

    it('refuses a protected handler when there is no subject', async () => {
        getSubject.mock.mockImplementation(async () => undefined);

        await assert.rejects(
            guard.canActivate(contextFor(Posts, 'read')),
            (error) => error instanceof UnauthorizedException,
        );
        assert.equal(rbacService.hasAllPermissions.mock.callCount(), 0);
    });

    it('checks the subject it resolved against the declared permissions', async () => {
        grants.permissions = ['read:posts'];
        const context = contextFor(Posts, 'read');

        assert.equal(await guard.canActivate(context), true);
        assert.deepEqual(lastCall(getSubject), [context]);
        assert.deepEqual(lastCall(rbacService.hasAllPermissions), [
            { subject: user, names: ['read:posts'] },
        ]);
        assert.equal(rbacService.hasAnyRole.mock.callCount(), 0);
    });

    it('applies the controller roles to a handler that declares none', async () => {
        grants.roles = ['editor'];
        assert.equal(await guard.canActivate(contextFor(Admin, 'list')), false);

        grants.roles = ['admin'];
        assert.equal(await guard.canActivate(contextFor(Admin, 'list')), true);
        assert.deepEqual(lastCall(rbacService.hasAnyRole), [
            { subject: user, names: ['admin'] },
        ]);
    });

    it('lets handler roles replace the controller roles', async () => {
        grants.roles = ['admin'];
        assert.equal(
            await guard.canActivate(contextFor(Admin, 'edit')),
            false,
            'the controller roles were merged in',
        );

        grants.roles = ['editor'];
        assert.equal(await guard.canActivate(contextFor(Admin, 'edit')), true);
    });

    it('requires the controller roles and the handler permissions together', async () => {
        for (const [roles, permissions, allowed] of [
            [['admin'], [], false],
            [[], ['delete:posts'], false],
            [['admin'], ['delete:posts'], true],
        ] as const) {
            grants.roles = [...roles];
            grants.permissions = [...permissions];

            assert.equal(
                await guard.canActivate(contextFor(Admin, 'remove')),
                allowed,
                `roles [${roles}], permissions [${permissions}]`,
            );
        }
    });
});
