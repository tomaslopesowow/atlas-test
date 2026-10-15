import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import type { RbacService } from '@repo/rbac';
import { verifyPassword } from '../auth/password.js';
import { ROLES } from '../auth/permissions.js';
import type { AppConfig } from '../config/app.config.js';
import type { UsersService } from '../users/users.service.js';
import { RolesSeeder } from './roles.seeder.js';

const rbacService = {
    ensureRole: mock.fn(async (_input: unknown) => ({})),
    hasAnyRole: mock.fn(async (_input: unknown) => false),
    findRoleByName: mock.fn(async (_input: unknown) => ({
        id: 7,
        name: 'admin',
    })),
    attachRole: mock.fn(async (_input: unknown) => ({})),
};

const usersService = {
    findIdByEmail: mock.fn(
        async (_input: unknown): Promise<number | undefined> => undefined,
    ),
    create: mock.fn(async (_input: unknown) => ({ id: 1 })),
};

const aSeeder = (config: Partial<AppConfig>) =>
    new RolesSeeder(
        rbacService as unknown as RbacService,
        usersService as unknown as UsersService,
        config as AppConfig,
    );

const admin = { modelType: 'user', modelId: 1 };

beforeEach(() => {
    for (const fn of [
        ...Object.values(rbacService),
        ...Object.values(usersService),
    ]) {
        fn.mock.resetCalls();
        fn.mock.restore();
    }
});

describe('RolesSeeder', () => {
    it('brings every role up to date', async () => {
        await aSeeder({}).onApplicationBootstrap();

        assert.deepEqual(
            rbacService.ensureRole.mock.calls.map(
                ({ arguments: [input] }) => input,
            ),
            Object.entries(ROLES).map(([name, permissions]) => ({
                name,
                permissions,
            })),
        );
    });

    it('makes no admin without ADMIN_EMAIL', async () => {
        await aSeeder({}).onApplicationBootstrap();

        assert.equal(usersService.findIdByEmail.mock.callCount(), 0);
        assert.equal(rbacService.attachRole.mock.callCount(), 0);
    });

    it('creates the admin account with ADMIN_PASSWORD, hashed, and makes it an admin', async () => {
        await aSeeder({
            adminEmail: 'admin@atlas.test',
            adminPassword: 'admin password',
        }).onApplicationBootstrap();

        const [input] = usersService.create.mock.calls[0]?.arguments as [
            { email: string; passwordHash: string },
        ];

        assert.equal(input.email, 'admin@atlas.test');
        assert.equal(
            await verifyPassword({
                password: 'admin password',
                hash: input.passwordHash,
            }),
            true,
        );
        assert.deepEqual(rbacService.attachRole.mock.calls[0]?.arguments, [
            { ...admin, roleId: 7 },
        ]);
    });

    it('refuses to boot without a password it needs, or with one too short', async () => {
        for (const adminPassword of [undefined, 'short'])
            await assert.rejects(
                aSeeder({
                    adminEmail: 'admin@atlas.test',
                    adminPassword,
                }).onApplicationBootstrap(),
                /ADMIN_PASSWORD, of at least 8 characters, is needed/,
            );

        assert.equal(usersService.create.mock.callCount(), 0);
    });

    it('refuses to boot rather than make an account that has the email an admin, as anyone can register one', async () => {
        usersService.findIdByEmail.mock.mockImplementation(async () => 1);

        await assert.rejects(
            aSeeder({
                adminEmail: 'admin@atlas.test',
            }).onApplicationBootstrap(),
            /which an account that is no admin already has/,
        );
        assert.equal(usersService.create.mock.callCount(), 0);
        assert.equal(rbacService.attachRole.mock.callCount(), 0);
    });

    it('leaves an admin who is one already alone', async () => {
        usersService.findIdByEmail.mock.mockImplementation(async () => 1);
        rbacService.hasAnyRole.mock.mockImplementation(async () => true);

        await aSeeder({
            adminEmail: 'admin@atlas.test',
        }).onApplicationBootstrap();

        assert.deepEqual(rbacService.hasAnyRole.mock.calls[0]?.arguments, [
            { ...admin, names: ['admin'] },
        ]);
        assert.equal(rbacService.attachRole.mock.callCount(), 0);
    });
});
