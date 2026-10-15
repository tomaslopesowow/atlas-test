import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import {
    type PermissionOutput,
    toPermissionOutput,
} from './dto/permission.output.js';
import type { PermissionsInput } from './dto/permissions.input.js';
import type { RoleInput } from './dto/role.input.js';
import { type RoleOutput, toRoleOutput } from './dto/role.output.js';
import type { RoleAttachmentInput } from './dto/role-attachment.input.js';
import type { RoleAttachmentOutput } from './dto/role-attachment.output.js';
import { PermissionEntity } from './entities/permission.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { RoleAttachmentEntity } from './entities/role-attachment.entity.js';
import {
    type FindOrCreatePermissionsInput,
    type FindRoleInput,
    type PermissionIdsInput,
    type PermissionLinksInput,
    type PermissionName,
    type RbacSubject,
    type RoleIdInput,
    type RoleNameInput,
    type RolePermissionsInput,
    type SubjectCheckInput,
    type SubjectInput,
} from './types/types.js';

// an action, then what it applies to: two or more segments of letters, digits, '_', '-' or '.'
const PERMISSION_NAME = /^[a-z0-9_.-]+(:[a-z0-9_.-]+)+$/;

// a concurrent ensureRole can take the name or link a permission first; the next attempt finds that done
const ENSURE_ATTEMPTS = 3;

const normalizeName = (name: string) => name.trim().toLowerCase();

const postgresCode = (error: unknown) =>
    error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;

// raised for the write that loses a race
const UNIQUE_VIOLATION = '23505';

// raised for an attachRole whose role was deleted after it was found
const FOREIGN_KEY_VIOLATION = '23503';

const conflictOnDuplicate = async <T>(
    write: Promise<T>,
    message: string,
): Promise<T> => {
    try {
        return await write;
    } catch (error) {
        if (postgresCode(error) === UNIQUE_VIOLATION)
            throw new ConflictException(message);
        throw error;
    }
};

@Injectable()
export class RbacService {
    constructor(
        @InjectRepository(RoleEntity)
        private readonly roleRepository: Repository<RoleEntity>,

        @InjectRepository(PermissionEntity)
        private readonly permissionRepository: Repository<PermissionEntity>,

        @InjectRepository(RoleAttachmentEntity)
        private readonly roleAttachmentRepository: Repository<RoleAttachmentEntity>,
    ) {}

    /** Create a role, linking the named permissions and creating the missing ones. */
    async createRole({
        name,
        permissions = [],
    }: RoleInput): Promise<RoleOutput> {
        const normalized = normalizeName(name);
        const taken = `Role "${normalized}" already exists`;

        // whitespace passes the DTO's @IsNotEmpty(), and would be stored as ''
        if (!normalized) throw new BadRequestException('Provide a role name');

        // one transaction, so a role refused for its name leaves none of its permissions behind
        const role = await conflictOnDuplicate(
            this.roleRepository.manager.transaction(async (manager) => {
                const roles = manager.getRepository(RoleEntity);

                return roles.save(
                    roles.create({
                        name: normalized,
                        permissions: await this.findOrCreatePermissions({
                            names: permissions,
                            manager,
                        }),
                    }),
                );
            }),
            taken,
        );

        return toRoleOutput(role);
    }

    /** The role with this name, holding at least these permissions: created, or given the missing ones. Safe to run on every boot, and concurrently. */
    async ensureRole({
        name,
        permissions = [],
    }: RoleInput): Promise<RoleOutput> {
        for (let attempt = 1; ; attempt++) {
            try {
                const existing = await this.roleRepository.findOneBy({
                    name: normalizeName(name),
                });

                return existing
                    ? await this.addPermissions({
                          roleId: existing.id,
                          names: permissions,
                      })
                    : await this.createRole({ name, permissions });
            } catch (error) {
                if (
                    !(error instanceof ConflictException) ||
                    attempt === ENSURE_ATTEMPTS
                )
                    throw error;
            }
        }
    }

    /** Every role with its permissions, by name. */
    async listRoles(): Promise<RoleOutput[]> {
        const roles = await this.roleRepository.find({
            relations: { permissions: true },
            order: { name: 'ASC' },
        });

        return roles.map(toRoleOutput);
    }

    /** The role with this name, with its permissions. */
    async findRoleByName({ name }: RoleNameInput): Promise<RoleOutput> {
        const normalized = normalizeName(name);
        const role = await this.roleRepository.findOne({
            where: { name: normalized },
            relations: { permissions: true },
        });

        if (!role) throw new NotFoundException(`No role named "${normalized}"`);

        return toRoleOutput(role);
    }

    /** The roles attached to a subject, with their permissions, by name. */
    async rolesOf({
        subject: { modelType, modelId },
    }: SubjectInput): Promise<RoleOutput[]> {
        const roles = await this.roleRepository.find({
            where: { attachments: { modelType, modelId } },
            relations: { permissions: true },
            order: { name: 'ASC' },
        });

        return roles.map(toRoleOutput);
    }

    /** Delete a role; the database drops its attachments and permission links, the permissions stay. */
    async deleteRole({ roleId }: RoleIdInput): Promise<void> {
        const { affected } = await this.roleRepository.delete({ id: roleId });

        if (!affected) throw new NotFoundException(`No role with id ${roleId}`);
    }

    /** Attach a role to a model. */
    async attachRole({
        roleId,
        modelType,
        modelId,
    }: RoleAttachmentInput): Promise<RoleAttachmentOutput> {
        await this.assertModelExists({ modelType, modelId });

        const role = await this.findRole({ roleId });

        try {
            await this.roleAttachmentRepository.insert({
                roleId,
                modelType,
                modelId,
            });
        } catch (error) {
            if (postgresCode(error) === UNIQUE_VIOLATION)
                throw new ConflictException(
                    `Role ${roleId} is already attached to ${modelType} ${modelId}`,
                );
            if (postgresCode(error) === FOREIGN_KEY_VIOLATION)
                throw new NotFoundException(`No role with id ${roleId}`);

            throw error;
        }

        return { role: toRoleOutput(role), modelType, modelId };
    }

    /** Detach a role from a model, keeping the role. */
    async detachRole({
        roleId,
        modelType,
        modelId,
    }: RoleAttachmentInput): Promise<void> {
        await this.findRole({ roleId });

        const { affected } = await this.roleAttachmentRepository.delete({
            roleId,
            modelType,
            modelId,
        });

        if (!affected)
            throw new NotFoundException(
                `Role ${roleId} is not attached to ${modelType} ${modelId}`,
            );
    }

    /** Create permissions attached to no role, refusing any name that exists. */
    async createPermissions({
        names,
    }: PermissionsInput): Promise<PermissionOutput[]> {
        const validNames = this.validatePermissionNames({ names });
        if (validNames.length === 0) return [];

        const existing = await this.permissionRepository.findBy({
            name: In(validNames),
        });

        if (existing.length)
            throw new ConflictException(
                `Permissions already exist: ${existing.map((p) => p.name).join(', ')}`,
            );

        const permissions = await conflictOnDuplicate(
            this.permissionRepository.save(
                this.permissionRepository.create(
                    validNames.map((name) => ({ name })),
                ),
            ),
            `Permissions already exist: ${validNames.join(', ')}`,
        );

        return permissions.map(toPermissionOutput);
    }

    /** Delete permissions by id, unlinking them from every role; returns how many went. */
    async deletePermissionsById({ ids }: PermissionIdsInput): Promise<number> {
        if (ids.length === 0) return 0;

        return (await this.permissionRepository.delete(ids)).affected ?? 0;
    }

    /** Delete permissions by name, unlinking them from every role; returns how many went. */
    async deletePermissionsByName({
        names,
    }: PermissionsInput): Promise<number> {
        if (names.length === 0) return 0;

        const { affected } = await this.permissionRepository.delete({
            name: In(names.map(normalizeName)),
        });

        return affected ?? 0;
    }

    /** Give a role more permissions, creating the ones that do not exist yet. */
    async addPermissions({
        roleId,
        names,
    }: RolePermissionsInput): Promise<RoleOutput> {
        const role = await this.findRole({ roleId, withPermissions: true });
        const held = new Set(role.permissions?.map(({ id }) => id));

        // one transaction, so a link that fails leaves none of the new permissions behind
        const missing = await conflictOnDuplicate(
            this.roleRepository.manager.transaction(async (manager) => {
                const permissions = await this.findOrCreatePermissions({
                    names,
                    manager,
                });
                const unheld = permissions.filter(({ id }) => !held.has(id));

                if (unheld.length)
                    await this.permissionLinks({ roleId, manager }).add(unheld);

                return unheld;
            }),
            `Role ${roleId} already has one of these permissions`,
        );

        role.permissions = [...(role.permissions ?? []), ...missing];

        return toRoleOutput(role);
    }

    /** Take permissions away from a role; the permissions stay for other roles. */
    async removePermissions({
        roleId,
        names,
    }: RolePermissionsInput): Promise<RoleOutput> {
        const role = await this.findRole({ roleId, withPermissions: true });
        const unwanted = new Set(names.map(normalizeName));

        const held = role.permissions ?? [];
        const removed = held.filter(({ name }) => unwanted.has(name));

        if (removed.length)
            await this.permissionLinks({
                roleId,
                manager: this.roleRepository.manager,
            }).remove(removed);

        role.permissions = held.filter(({ name }) => !unwanted.has(name));

        return toRoleOutput(role);
    }

    /** Take every permission away from a role; returns how many it had. */
    async removeAllPermissions({ roleId }: RoleIdInput): Promise<number> {
        const { permissions = [] } = await this.findRole({
            roleId,
            withPermissions: true,
        });

        if (permissions.length)
            await this.permissionLinks({
                roleId,
                manager: this.roleRepository.manager,
            }).remove(permissions);

        return permissions.length;
    }

    /** Whether one of the roles attached to the subject has one of the names. */
    async hasAnyRole({
        subject: { modelType, modelId },
        names,
    }: SubjectCheckInput): Promise<boolean> {
        if (names.length === 0) return false;

        return this.roleRepository.exists({
            where: {
                name: In(names.map(normalizeName)),
                attachments: { modelType, modelId },
            },
        });
    }

    /** Whether the roles attached to the subject hold every one of the permissions, between them. */
    async hasAllPermissions({
        subject: { modelType, modelId },
        names,
    }: SubjectCheckInput): Promise<boolean> {
        const wanted = [...new Set(names.map(normalizeName))];
        if (wanted.length === 0) return true;

        // count() is DISTINCT on the id, so a permission held through two roles counts once
        const found = await this.permissionRepository.count({
            where: {
                name: In(wanted),
                roles: { attachments: { modelType, modelId } },
            },
        });

        return found === wanted.length;
    }

    private async findRole({
        roleId,
        withPermissions = false,
    }: FindRoleInput): Promise<RoleEntity> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: { permissions: withPermissions },
        });

        if (!role) throw new NotFoundException(`No role with id ${roleId}`);

        return role;
    }

    // links and unlinks only the given permissions; save() would rewrite every link of
    // the role, dropping ones a concurrent request added
    private permissionLinks({ roleId, manager }: PermissionLinksInput) {
        return manager
            .getRepository(RoleEntity)
            .createQueryBuilder()
            .relation(RoleEntity, 'permissions')
            .of(roleId);
    }

    // polymorphic links have no foreign key, so the model's existence is checked here instead
    private async assertModelExists({
        modelType,
        modelId,
    }: RbacSubject): Promise<void> {
        const { manager } = this.roleAttachmentRepository;
        const metadata = manager.dataSource.entityMetadatas.find(
            ({ tableName }) => tableName === modelType,
        );

        if (!metadata || typeof metadata.target === 'string')
            throw new BadRequestException(
                `No entity is registered for "${modelType}"`,
            );

        if (!(await manager.existsBy(metadata.target, { id: modelId })))
            throw new NotFoundException(`No ${modelType} with id ${modelId}`);
    }

    private async findOrCreatePermissions({
        names,
        manager,
    }: FindOrCreatePermissionsInput): Promise<PermissionEntity[]> {
        const validNames = this.validatePermissionNames({ names });
        if (validNames.length === 0) return [];

        const permissions = manager.getRepository(PermissionEntity);

        // ON CONFLICT DO NOTHING: links a permission a concurrent request created, and unlike
        // DO UPDATE it does not lock existing rows, which deadlocks with role_permission inserts.
        // Sorted, as a transaction holds each new row until it commits: two inserting the same
        // names in different orders would each wait for the other.
        await permissions
            .createQueryBuilder()
            .insert()
            .values([...validNames].sort().map((name) => ({ name })))
            .orIgnore()
            .execute();

        return permissions.findBy({ name: In(validNames) });
    }

    // normalised and deduplicated, as they are stored
    private validatePermissionNames({
        names,
    }: PermissionsInput): PermissionName[] {
        const validNames = names.map((name) => {
            const normalized = normalizeName(name);

            if (!PERMISSION_NAME.test(normalized))
                throw new BadRequestException(
                    `Invalid permission name "${name}"`,
                );

            return normalized as PermissionName;
        });

        return [...new Set(validNames)];
    }
}
