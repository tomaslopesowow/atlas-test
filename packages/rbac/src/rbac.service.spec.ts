import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type DeepPartial, In, QueryFailedError } from 'typeorm';
import { PermissionEntity } from './entities/permission.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { RoleAttachmentEntity } from './entities/role-attachment.entity.js';
import { RbacService } from './rbac.service.js';
import type { PermissionName } from './types/types.js';

class User {}

const aPermission = (id: number, name: PermissionName): PermissionEntity =>
    Object.assign(new PermissionEntity(), { id, name });

const aRole = (overrides: Partial<RoleEntity> = {}): RoleEntity =>
    Object.assign(new RoleEntity(), { id: 2, name: 'editor', ...overrides });

/** What the pg driver raises when a constraint rejects a write. */
const queryFailed = (code: string) =>
    new QueryFailedError(
        'INSERT ...',
        [],
        Object.assign(new Error('constraint violated'), { code }),
    );

const uniqueViolation = () => queryFailed('23505');

const user = { modelType: 'user', modelId: 5 };
const link = { roleId: 2, ...user };

const manager = {
    dataSource: {
        entityMetadatas: [
            { tableName: 'user', target: User },
            { tableName: 'legacy', target: 'legacy' },
        ],
    },
    existsBy: mock.fn(
        async (_target: unknown, _where: unknown): Promise<boolean> => true,
    ),
};

/** Whether a fake write ran inside the transaction createRole or addPermissions opened. */
let inTransaction = false;

/** The role repository's manager, handing out the same fakes inside and outside a transaction. */
const roleManager = {
    getRepository: mock.fn((target: unknown): unknown =>
        target === RoleEntity ? roleRepository : permissionRepository,
    ),
    transaction: mock.fn(
        async (run: (manager: typeof roleManager) => Promise<unknown>) => {
            inTransaction = true;

            try {
                return await run(roleManager);
            } finally {
                inTransaction = false;
            }
        },
    ),
};

const roleRepository = {
    manager: roleManager,
    create: mock.fn(
        (input: DeepPartial<RoleEntity>): RoleEntity =>
            Object.assign(new RoleEntity(), input),
    ),
    save: mock.fn(
        async (role: RoleEntity): Promise<RoleEntity> =>
            Object.assign(role, { id: 2 }),
    ),
    findOne: mock.fn(
        async (_options: unknown): Promise<RoleEntity | null> => aRole(),
    ),
    findOneBy: mock.fn(
        async (_where: unknown): Promise<RoleEntity | null> => null,
    ),
    find: mock.fn(async (_options: unknown): Promise<RoleEntity[]> => []),
    exists: mock.fn(async (_options: unknown): Promise<boolean> => true),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number | null }> => ({
            affected: 1,
        }),
    ),
    createQueryBuilder: mock.fn((): unknown => relationQuery),
};

const relationQuery = {
    relation: mock.fn(
        (_target: unknown, _property: string): unknown => relationQuery,
    ),
    of: mock.fn((_id: unknown): unknown => relationQuery),
    add: mock.fn(async (_values: unknown): Promise<void> => {}),
    remove: mock.fn(async (_values: unknown): Promise<void> => {}),
};

const insertQuery = {
    insert: mock.fn((): unknown => insertQuery),
    values: mock.fn((_values: object[]): unknown => insertQuery),
    orIgnore: mock.fn((): unknown => insertQuery),
    execute: mock.fn(async (): Promise<unknown> => ({})),
};

const permissionRepository = {
    createQueryBuilder: mock.fn((): unknown => insertQuery),
    create: mock.fn(
        (input: DeepPartial<PermissionEntity>[]): PermissionEntity[] =>
            input.map((p) => Object.assign(new PermissionEntity(), p)),
    ),
    save: mock.fn(
        async (permissions: PermissionEntity[]): Promise<PermissionEntity[]> =>
            permissions.map((p, i) => Object.assign(p, { id: 10 + i })),
    ),
    findBy: mock.fn(async (_where: unknown): Promise<PermissionEntity[]> => []),
    count: mock.fn(async (_options: unknown): Promise<number> => 0),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number | null }> => ({
            affected: 1,
        }),
    ),
};

const attachmentRepository = {
    manager,
    insert: mock.fn(
        async (_attachment: DeepPartial<RoleAttachmentEntity>) => ({}),
    ),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number | null }> => ({
            affected: 1,
        }),
    ),
};

type Mock = { mock: { restore(): void; resetCalls(): void } };

// `mock` is served by the proxy's get trap, so an `in` check never sees it
const isMock = (value: unknown): value is Mock =>
    typeof value === 'function' && (value as Partial<Mock>).mock !== undefined;

/** `restore` puts the initial implementation back, so nothing leaks between tests. */
const resetMocks = (...groups: object[]) => {
    for (const fn of groups.flatMap(Object.values).filter(isMock)) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }
};

const lastCall = (fn: {
    mock: { calls: readonly { arguments: readonly unknown[] }[] };
}) => fn.mock.calls.at(-1)?.arguments;

const savedRole = () => lastCall(roleRepository.save)?.[0] as RoleEntity;
const createdPermissions = () => lastCall(permissionRepository.create)?.[0];
const insertedPermissions = () => lastCall(insertQuery.values)?.[0];

const isA =
    (type: new (...args: never[]) => Error, message?: RegExp) =>
    (error: unknown) =>
        error instanceof type && (!message || message.test(error.message));

let rbacService: RbacService;

beforeEach(async () => {
    resetMocks(
        manager,
        roleManager,
        roleRepository,
        relationQuery,
        permissionRepository,
        insertQuery,
        attachmentRepository,
    );

    const module = await Test.createTestingModule({
        providers: [
            RbacService,
            {
                provide: getRepositoryToken(RoleEntity),
                useValue: roleRepository,
            },
            {
                provide: getRepositoryToken(PermissionEntity),
                useValue: permissionRepository,
            },
            {
                provide: getRepositoryToken(RoleAttachmentEntity),
                useValue: attachmentRepository,
            },
        ],
    }).compile();

    rbacService = module.get(RbacService);
});

describe('RbacService.createRole', () => {
    it('creates a role without permissions, inserting none', async () => {
        const result = await rbacService.createRole({ name: 'editor' });

        assert.deepEqual(result, { id: 2, name: 'editor', permissions: [] });
        assert.equal(
            permissionRepository.createQueryBuilder.mock.callCount(),
            0,
        );
    });

    it('stores the name trimmed and lowercased, as permission names are', async () => {
        const result = await rbacService.createRole({ name: ' Editor\n' });

        assert.equal(savedRole().name, 'editor');
        assert.equal(result.name, 'editor');
    });

    it('refuses a name that is only whitespace, before querying anything', async () => {
        await assert.rejects(
            rbacService.createRole({ name: ' \t ' }),
            isA(BadRequestException, /Provide a role name/),
        );
        assert.equal(roleManager.transaction.mock.callCount(), 0);
        assert.equal(roleRepository.save.mock.callCount(), 0);
    });

    it('shares the permissions that already exist with the new role', async () => {
        permissionRepository.findBy.mock.mockImplementation(async () => [
            aPermission(1, 'read:posts'),
            aPermission(2, 'update:posts'),
            aPermission(3, 'delete:posts'),
        ]);

        await rbacService.createRole({
            name: 'admin',
            permissions: ['read:posts', 'update:posts', 'delete:posts'],
        });

        assert.deepEqual(insertedPermissions(), [
            { name: 'delete:posts' },
            { name: 'read:posts' },
            { name: 'update:posts' },
        ]);
        assert.equal(
            insertQuery.orIgnore.mock.callCount(),
            1,
            'an existing name would fail the insert instead of being skipped',
        );
        assert.deepEqual(
            savedRole().permissions?.map(({ id, name }) => [id, name]),
            [
                [1, 'read:posts'],
                [2, 'update:posts'],
                [3, 'delete:posts'],
            ],
        );
    });

    it('looks the permissions up by the lowercased, deduplicated names it stores', async () => {
        await rbacService.createRole({
            name: 'editor',
            permissions: ['Read:Posts', ' read:posts'],
        });

        assert.deepEqual(insertedPermissions(), [{ name: 'read:posts' }]);
        assert.deepEqual(lastCall(permissionRepository.findBy), [
            { name: In(['read:posts']) },
        ]);
    });

    it('creates its permissions and the role in one transaction, so a refused role leaves none behind', async () => {
        const writes: string[] = [];
        insertQuery.execute.mock.mockImplementation(async () => {
            writes.push(`permissions in transaction: ${inTransaction}`);
            return {};
        });
        roleRepository.save.mock.mockImplementation(async () => {
            writes.push(`role in transaction: ${inTransaction}`);
            throw uniqueViolation();
        });

        await assert.rejects(
            rbacService.createRole({
                name: 'editor',
                permissions: ['read:posts'],
            }),
            isA(ConflictException, /Role "editor" already exists/),
        );
        assert.deepEqual(writes, [
            'permissions in transaction: true',
            'role in transaction: true',
        ]);
    });

    it('passes on a failed save that is not about the name', async () => {
        const failure = new Error('connection terminated');
        roleRepository.save.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            rbacService.createRole({ name: 'editor' }),
            failure,
        );
    });

    it('refuses an invalid permission before writing anything', async () => {
        await assert.rejects(
            rbacService.createRole({
                name: 'editor',
                permissions: ['read:posts', 'publish posts'],
            }),
            isA(BadRequestException, /Invalid permission name "publish posts"/),
        );
        assert.equal(
            permissionRepository.createQueryBuilder.mock.callCount(),
            0,
        );
        assert.equal(roleRepository.save.mock.callCount(), 0);
    });
});

describe('RbacService.deleteRole', () => {
    it('deletes the role by id, leaving its permissions for other roles', async () => {
        await rbacService.deleteRole({ roleId: 2 });

        assert.deepEqual(lastCall(roleRepository.delete), [{ id: 2 }]);
        assert.equal(permissionRepository.delete.mock.callCount(), 0);
    });

    it('reports a role that does not exist', async () => {
        roleRepository.delete.mock.mockImplementation(async () => ({
            affected: 0,
        }));

        await assert.rejects(
            rbacService.deleteRole({ roleId: 2 }),
            isA(NotFoundException, /No role with id 2/),
        );
    });
});

describe('RbacService.attachRole', () => {
    it('links the role to the model', async () => {
        const result = await rbacService.attachRole(link);

        assert.deepEqual(lastCall(attachmentRepository.insert), [
            { roleId: 2, modelType: 'user', modelId: 5 },
        ]);
        assert.deepEqual(result, {
            role: { id: 2, name: 'editor', permissions: undefined },
            modelType: 'user',
            modelId: 5,
        });
    });

    it('refuses a link that already exists, as the unique constraint reports it', async () => {
        attachmentRepository.insert.mock.mockImplementation(async () => {
            throw uniqueViolation();
        });

        await assert.rejects(
            rbacService.attachRole(link),
            isA(ConflictException, /Role 2 is already attached to user 5/),
        );
    });

    it('propagates any other failed insert', async () => {
        const failure = new Error('connection terminated');
        attachmentRepository.insert.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(rbacService.attachRole(link), failure);
    });

    it('reports a role deleted between being found and attached as missing', async () => {
        attachmentRepository.insert.mock.mockImplementation(async () => {
            throw queryFailed('23503');
        });

        await assert.rejects(
            rbacService.attachRole(link),
            isA(NotFoundException, /No role with id 2/),
        );
    });

    it('rejects a model type no entity is registered for', async () => {
        await assert.rejects(
            rbacService.attachRole({ ...link, modelType: 'ghost' }),
            isA(BadRequestException, /No entity is registered for "ghost"/),
        );
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });

    it('rejects a model type backed by an entity schema, which has no class to look the model up by', async () => {
        await assert.rejects(
            rbacService.attachRole({ ...link, modelType: 'legacy' }),
            isA(BadRequestException, /No entity is registered for "legacy"/),
        );
        assert.equal(manager.existsBy.mock.callCount(), 0);
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });

    it('rejects a model that does not exist, which no foreign key would catch', async () => {
        manager.existsBy.mock.mockImplementation(async () => false);

        await assert.rejects(
            rbacService.attachRole(link),
            isA(NotFoundException, /No user with id 5/),
        );
        assert.deepEqual(lastCall(manager.existsBy), [User, { id: 5 }]);
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });
});

describe('RbacService.detachRole', () => {
    it('removes only the link between the role and that model', async () => {
        await rbacService.detachRole(link);

        assert.deepEqual(lastCall(attachmentRepository.delete), [
            { roleId: 2, modelType: 'user', modelId: 5 },
        ]);
        assert.equal(roleRepository.delete.mock.callCount(), 0);
    });

    it('reports a link that does not exist', async () => {
        attachmentRepository.delete.mock.mockImplementation(async () => ({
            affected: 0,
        }));

        await assert.rejects(
            rbacService.detachRole(link),
            isA(NotFoundException, /Role 2 is not attached to user 5/),
        );
    });
});

describe('RbacService.deleteForModel', () => {
    it("deletes every one of the model's attachments, keeping the roles, and reports how many went", async () => {
        attachmentRepository.delete.mock.mockImplementation(async () => ({
            affected: 2,
        }));

        assert.equal(await rbacService.deleteForModel(user), 2);
        assert.deepEqual(lastCall(attachmentRepository.delete), [
            { modelType: 'user', modelId: 5 },
        ]);
        assert.equal(roleRepository.delete.mock.callCount(), 0);
    });
});

describe('RbacService.createPermissions', () => {
    it('creates a permission and returns it as a plain output', async () => {
        const result = await rbacService.createPermissions({
            names: ['read:posts'],
        });

        assert.deepEqual(result, [{ id: 10, name: 'read:posts' }]);
    });

    it('looks up and creates a name repeated in one request once, as it is stored', async () => {
        await rbacService.createPermissions({
            names: ['read:posts', ' Read:Posts\n'],
        });

        assert.deepEqual(lastCall(permissionRepository.findBy), [
            { name: In(['read:posts']) },
        ]);
        assert.deepEqual(
            createdPermissions(),
            [{ name: 'read:posts' }],
            'two rows with one name break the unique constraint',
        );
    });

    it('takes any action, and keeps a name with more than one colon whole', async () => {
        await rbacService.createPermissions({
            names: [
                'send:announcements',
                'export:reports.csv',
                'read:posts:own',
            ],
        });

        assert.deepEqual(createdPermissions(), [
            { name: 'send:announcements' },
            { name: 'export:reports.csv' },
            { name: 'read:posts:own' },
        ]);
    });

    it('refuses names that already exist, creating none of the others', async () => {
        permissionRepository.findBy.mock.mockImplementation(async () => [
            aPermission(1, 'read:posts'),
            aPermission(2, 'update:posts'),
        ]);

        await assert.rejects(
            rbacService.createPermissions({
                names: ['read:posts', 'update:posts', 'delete:posts'],
            }),
            isA(
                ConflictException,
                /Permissions already exist: read:posts, update:posts$/,
            ),
        );
        assert.equal(permissionRepository.save.mock.callCount(), 0);
    });

    it('reports a name created by a concurrent request as a conflict', async () => {
        permissionRepository.save.mock.mockImplementation(async () => {
            throw uniqueViolation();
        });

        await assert.rejects(
            rbacService.createPermissions({ names: ['read:posts'] }),
            isA(ConflictException, /read:posts/),
        );
    });

    it('creates nothing for an empty list, without querying', async () => {
        assert.deepEqual(
            await rbacService.createPermissions({ names: [] }),
            [],
        );
        assert.equal(permissionRepository.findBy.mock.callCount(), 0);
        assert.equal(permissionRepository.save.mock.callCount(), 0);
    });

    it('refuses a malformed name anywhere in the list before querying anything', async () => {
        for (const name of [
            'publish',
            'read',
            'read:',
            ':posts',
            'read::',
            'read:posts:',
            'read: posts',
            'read:blog posts',
            'read:posts*',
        ])
            await assert.rejects(
                rbacService.createPermissions({ names: ['read:posts', name] }),
                isA(BadRequestException, /Invalid permission name/),
                `"${name}" was accepted`,
            );

        assert.equal(permissionRepository.findBy.mock.callCount(), 0);
        assert.equal(permissionRepository.save.mock.callCount(), 0);
    });
});

describe('RbacService.deletePermissionsById', () => {
    it('deletes every id of the list and reports how many went', async () => {
        permissionRepository.delete.mock.mockImplementation(async () => ({
            affected: 2,
        }));

        assert.equal(
            await rbacService.deletePermissionsById({ ids: [3, 4] }),
            2,
        );
        assert.deepEqual(lastCall(permissionRepository.delete), [[3, 4]]);
    });

    it('deletes nothing for an empty list', async () => {
        assert.equal(await rbacService.deletePermissionsById({ ids: [] }), 0);
        assert.equal(
            permissionRepository.delete.mock.callCount(),
            0,
            'TypeORM throws on empty delete criteria',
        );
    });
});

describe('RbacService.deletePermissionsByName', () => {
    it('deletes by the names as they are stored', async () => {
        await rbacService.deletePermissionsByName({
            names: [' Read:Posts ', 'update:posts'],
        });

        assert.deepEqual(lastCall(permissionRepository.delete), [
            { name: In(['read:posts', 'update:posts']) },
        ]);
    });

    it('deletes nothing for an empty list, without querying', async () => {
        assert.equal(
            await rbacService.deletePermissionsByName({ names: [] }),
            0,
        );
        assert.equal(permissionRepository.delete.mock.callCount(), 0);
    });
});

describe('RbacService.addPermissions', () => {
    beforeEach(() => {
        roleRepository.findOne.mock.mockImplementation(async () =>
            aRole({ permissions: [aPermission(1, 'read:posts')] }),
        );
        permissionRepository.findBy.mock.mockImplementation(async () => [
            aPermission(1, 'read:posts'),
            aPermission(3, 'delete:posts'),
        ]);
    });

    it('creates the permissions and links them in one transaction, so a failed link leaves none behind', async () => {
        const writes: string[] = [];
        insertQuery.execute.mock.mockImplementation(async () => {
            writes.push(`permissions in transaction: ${inTransaction}`);
            return {};
        });
        relationQuery.add.mock.mockImplementation(async () => {
            writes.push(`links in transaction: ${inTransaction}`);
        });

        await rbacService.addPermissions({
            roleId: 2,
            names: ['delete:posts'],
        });

        assert.deepEqual(writes, [
            'permissions in transaction: true',
            'links in transaction: true',
        ]);
    });

    it('links only the permissions the role does not have yet, and returns every one it now has', async () => {
        const result = await rbacService.addPermissions({
            roleId: 2,
            names: ['read:posts', 'delete:posts'],
        });

        assert.deepEqual(lastCall(roleRepository.findOne), [
            { where: { id: 2 }, relations: { permissions: true } },
        ]);
        assert.deepEqual(lastCall(relationQuery.relation), [
            RoleEntity,
            'permissions',
        ]);
        assert.deepEqual(lastCall(relationQuery.of), [2]);
        assert.deepEqual(lastCall(relationQuery.add), [
            [aPermission(3, 'delete:posts')],
        ]);
        assert.deepEqual(result, {
            id: 2,
            name: 'editor',
            permissions: [
                { id: 1, name: 'read:posts' },
                { id: 3, name: 'delete:posts' },
            ],
        });
    });

    it('links nothing when the role has every permission already', async () => {
        permissionRepository.findBy.mock.mockImplementation(async () => [
            aPermission(1, 'read:posts'),
        ]);

        await rbacService.addPermissions({ roleId: 2, names: ['read:posts'] });

        assert.equal(relationQuery.add.mock.callCount(), 0);
    });

    it('reports a permission linked by a concurrent request as a conflict', async () => {
        relationQuery.add.mock.mockImplementation(async () => {
            throw uniqueViolation();
        });

        await assert.rejects(
            rbacService.addPermissions({ roleId: 2, names: ['delete:posts'] }),
            isA(ConflictException, /Role 2 already has/),
        );
    });
});

describe('RbacService.removePermissions', () => {
    beforeEach(() => {
        roleRepository.findOne.mock.mockImplementation(async () =>
            aRole({
                permissions: [
                    aPermission(1, 'read:posts'),
                    aPermission(2, 'update:posts'),
                ],
            }),
        );
    });

    it('unlinks the named permissions, matching names the way they are stored, and returns what is left', async () => {
        const result = await rbacService.removePermissions({
            roleId: 2,
            names: [' Update:Posts '],
        });

        assert.deepEqual(lastCall(roleRepository.findOne), [
            { where: { id: 2 }, relations: { permissions: true } },
        ]);
        assert.deepEqual(lastCall(relationQuery.of), [2]);
        assert.deepEqual(lastCall(relationQuery.remove), [
            [aPermission(2, 'update:posts')],
        ]);
        assert.deepEqual(result, {
            id: 2,
            name: 'editor',
            permissions: [{ id: 1, name: 'read:posts' }],
        });
    });

    it('unlinks nothing for names the role does not have', async () => {
        const result = await rbacService.removePermissions({
            roleId: 2,
            names: ['delete:posts'],
        });

        assert.equal(relationQuery.remove.mock.callCount(), 0);
        assert.equal(result.permissions?.length, 2);
    });
});

describe('RbacService.removeAllPermissions', () => {
    beforeEach(() => {
        roleRepository.findOne.mock.mockImplementation(async () =>
            aRole({
                permissions: [
                    aPermission(1, 'read:posts'),
                    aPermission(2, 'update:posts'),
                ],
            }),
        );
    });

    it('unlinks every permission and reports how many, keeping the permissions', async () => {
        assert.equal(await rbacService.removeAllPermissions({ roleId: 2 }), 2);

        assert.deepEqual(lastCall(roleRepository.findOne), [
            { where: { id: 2 }, relations: { permissions: true } },
        ]);
        assert.deepEqual(lastCall(relationQuery.of), [2]);
        assert.deepEqual(lastCall(relationQuery.remove), [
            [aPermission(1, 'read:posts'), aPermission(2, 'update:posts')],
        ]);
        assert.equal(
            roleRepository.save.mock.callCount(),
            0,
            'save() rewrites every link of the role, undoing ones a concurrent request added',
        );
        assert.equal(permissionRepository.delete.mock.callCount(), 0);
    });

    it('unlinks nothing for a role without permissions', async () => {
        roleRepository.findOne.mock.mockImplementation(async () =>
            aRole({ permissions: [] }),
        );

        assert.equal(await rbacService.removeAllPermissions({ roleId: 2 }), 0);
        assert.equal(relationQuery.remove.mock.callCount(), 0);
    });
});

describe('RbacService.hasAnyRole', () => {
    it('asks in one query whether a role with one of the names, as roles are stored, is attached to that exact model', async () => {
        assert.equal(
            await rbacService.hasAnyRole({
                ...user,
                names: [' Admin ', 'editor'],
            }),
            true,
        );
        assert.equal(roleRepository.exists.mock.callCount(), 1);
        assert.deepEqual(lastCall(roleRepository.exists), [
            {
                where: {
                    name: In(['admin', 'editor']),
                    attachments: { modelType: 'user', modelId: 5 },
                },
            },
        ]);
    });

    it('denies when no attached role has one of the names', async () => {
        roleRepository.exists.mock.mockImplementation(async () => false);

        assert.equal(
            await rbacService.hasAnyRole({ ...user, names: ['admin'] }),
            false,
        );
    });

    it('denies an empty list, as no role is among no names, without querying', async () => {
        assert.equal(
            await rbacService.hasAnyRole({ ...user, names: [] }),
            false,
        );
        assert.equal(roleRepository.exists.mock.callCount(), 0);
    });
});

describe('RbacService.hasAllPermissions', () => {
    it("counts in one query the requested permissions held through the model's roles, ignoring case, whitespace and repeats", async () => {
        permissionRepository.count.mock.mockImplementation(async () => 2);

        assert.equal(
            await rbacService.hasAllPermissions({
                ...user,
                names: [' Read:Posts', 'read:posts', 'update:posts'],
            }),
            true,
        );
        assert.equal(permissionRepository.count.mock.callCount(), 1);
        assert.deepEqual(lastCall(permissionRepository.count), [
            {
                where: {
                    name: In(['read:posts', 'update:posts']),
                    roles: { attachments: { modelType: 'user', modelId: 5 } },
                },
            },
        ]);
    });

    it('denies when one permission is missing', async () => {
        permissionRepository.count.mock.mockImplementation(async () => 1);

        assert.equal(
            await rbacService.hasAllPermissions({
                ...user,
                names: ['read:posts', 'update:posts'],
            }),
            false,
        );
    });

    it('grants an empty list, which requires nothing, without counting', async () => {
        assert.equal(
            await rbacService.hasAllPermissions({ ...user, names: [] }),
            true,
            'the guard relies on it for a route without @HasPermission()',
        );
        assert.equal(permissionRepository.count.mock.callCount(), 0);
    });
});

describe('RbacService.listRoles', () => {
    it('lists every role with its permissions, by name', async () => {
        roleRepository.find.mock.mockImplementation(async () => [
            aRole({
                id: 1,
                name: 'admin',
                permissions: [aPermission(1, 'read:users')],
            }),
            aRole({ id: 2, name: 'editor', permissions: [] }),
        ]);

        assert.deepEqual(await rbacService.listRoles(), [
            {
                id: 1,
                name: 'admin',
                permissions: [{ id: 1, name: 'read:users' }],
            },
            { id: 2, name: 'editor', permissions: [] },
        ]);
        assert.deepEqual(lastCall(roleRepository.find), [
            { relations: { permissions: true }, order: { name: 'ASC' } },
        ]);
    });
});

describe('RbacService.findRoleByName', () => {
    it('finds the role by its name as it is stored, with its permissions', async () => {
        roleRepository.findOne.mock.mockImplementation(async () =>
            aRole({ permissions: [aPermission(1, 'read:posts')] }),
        );

        assert.deepEqual(
            await rbacService.findRoleByName({ name: ' Editor ' }),
            {
                id: 2,
                name: 'editor',
                permissions: [{ id: 1, name: 'read:posts' }],
            },
        );
        assert.deepEqual(lastCall(roleRepository.findOne), [
            { where: { name: 'editor' }, relations: { permissions: true } },
        ]);
    });

    it('reports a name no role has', async () => {
        roleRepository.findOne.mock.mockImplementation(async () => null);

        await assert.rejects(
            rbacService.findRoleByName({ name: 'Ghost' }),
            isA(NotFoundException, /No role named "ghost"/),
        );
    });
});

describe('RbacService.rolesOf', () => {
    it("lists the model's roles with their permissions, by name", async () => {
        roleRepository.find.mock.mockImplementation(async () => [
            aRole({ permissions: [aPermission(1, 'read:posts')] }),
        ]);

        assert.deepEqual(await rbacService.rolesOf(user), [
            {
                id: 2,
                name: 'editor',
                permissions: [{ id: 1, name: 'read:posts' }],
            },
        ]);
        assert.deepEqual(lastCall(roleRepository.find), [
            {
                where: { attachments: { modelType: 'user', modelId: 5 } },
                relations: { permissions: true },
                order: { name: 'ASC' },
            },
        ]);
    });
});

describe('RbacService.ensureRole', () => {
    it('creates a role that does not exist, with its permissions', async () => {
        permissionRepository.findBy.mock.mockImplementation(async () => [
            aPermission(1, 'read:posts'),
        ]);

        const role = await rbacService.ensureRole({
            name: ' Editor ',
            permissions: ['read:posts'],
        });

        assert.deepEqual(lastCall(roleRepository.findOneBy), [
            { name: 'editor' },
        ]);
        assert.equal(savedRole().name, 'editor');
        assert.deepEqual(role.permissions, [{ id: 1, name: 'read:posts' }]);
    });

    it('gives a role that exists the permissions it lacks, creating nothing else', async () => {
        roleRepository.findOneBy.mock.mockImplementation(async () => aRole());
        roleRepository.findOne.mock.mockImplementation(async () =>
            aRole({ permissions: [aPermission(1, 'read:posts')] }),
        );
        permissionRepository.findBy.mock.mockImplementation(async () => [
            aPermission(1, 'read:posts'),
            aPermission(2, 'update:posts'),
        ]);

        const role = await rbacService.ensureRole({
            name: 'editor',
            permissions: ['read:posts', 'update:posts'],
        });

        assert.equal(roleRepository.save.mock.callCount(), 0);
        assert.deepEqual(lastCall(relationQuery.add), [
            [aPermission(2, 'update:posts')],
        ]);
        assert.deepEqual(
            role.permissions?.map(({ name }) => name),
            ['read:posts', 'update:posts'],
        );
    });

    it('adds to the role a concurrent request created first, rather than failing', async () => {
        let lookups = 0;

        roleRepository.findOneBy.mock.mockImplementation(async () =>
            lookups++ === 0 ? null : aRole(),
        );
        roleRepository.save.mock.mockImplementation(async () => {
            throw uniqueViolation();
        });

        const role = await rbacService.ensureRole({ name: 'editor' });

        assert.equal(role.name, 'editor');
        assert.equal(roleRepository.findOneBy.mock.callCount(), 2);
    });

    it('gives up after three conflicts in a row', async () => {
        roleRepository.save.mock.mockImplementation(async () => {
            throw uniqueViolation();
        });

        await assert.rejects(
            rbacService.ensureRole({ name: 'editor' }),
            ConflictException,
        );
        assert.equal(roleRepository.findOneBy.mock.callCount(), 3);
    });

    it('passes on any other failure at once', async () => {
        await assert.rejects(
            rbacService.ensureRole({
                name: 'editor',
                permissions: ['nonsense'],
            }),
            BadRequestException,
        );
        assert.equal(roleRepository.findOneBy.mock.callCount(), 1);
    });
});

describe('RbacService, given a role id that does not exist', () => {
    it('reports it from every method that takes one, before writing anything', async () => {
        roleRepository.findOne.mock.mockImplementation(async () => null);

        for (const [method, call] of [
            ['attachRole', () => rbacService.attachRole(link)],
            ['detachRole', () => rbacService.detachRole(link)],
            [
                'addPermissions',
                () =>
                    rbacService.addPermissions({
                        roleId: 2,
                        names: ['delete:posts'],
                    }),
            ],
            [
                'removePermissions',
                () =>
                    rbacService.removePermissions({
                        roleId: 2,
                        names: ['read:posts'],
                    }),
            ],
            [
                'removeAllPermissions',
                () => rbacService.removeAllPermissions({ roleId: 2 }),
            ],
        ] as const)
            await assert.rejects(
                call(),
                isA(NotFoundException, /No role with id 2/),
                method,
            );

        assert.partialDeepStrictEqual(lastCall(roleRepository.findOne)?.[0], {
            where: { id: 2 },
        });
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
        assert.equal(attachmentRepository.delete.mock.callCount(), 0);
        assert.equal(
            permissionRepository.createQueryBuilder.mock.callCount(),
            0,
        );
        assert.equal(relationQuery.add.mock.callCount(), 0);
        assert.equal(relationQuery.remove.mock.callCount(), 0);
    });
});
