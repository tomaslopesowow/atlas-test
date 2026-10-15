import { Injectable } from '@nestjs/common';
import {
    type CreateInput,
    DateTime,
    type DeleteRecordsInput,
    Email,
    HasMany,
    Password,
    Resource,
    Select,
    Text,
    Trend,
    type UpdateInput,
    Value,
} from '@repo/admin';
import { RbacService } from '@repo/rbac';
import { userRef } from '../../auth/current-user.js';
import { hashPassword } from '../../auth/password.js';
import { ROLES } from '../../auth/permissions.js';
import { UserEntity } from '../../users/user.entity.js';
import { normalizeEmail, UsersService } from '../../users/users.service.js';
import { csvExports } from '../actions/export-as-csv.action.js';

// as the api's own sign-up stores them, so the account can sign in
const stored = async (values: Partial<UserEntity>) => ({
    ...values,
    ...(values.email !== undefined && { email: normalizeEmail(values.email) }),
    ...(values.passwordHash !== undefined && {
        passwordHash: await hashPassword({ password: values.passwordHash }),
    }),
});

@Injectable()
export class UserResource extends Resource<UserEntity> {
    entity = UserEntity;

    constructor(
        private readonly rbacService: RbacService,

        private readonly usersService: UsersService,
    ) {
        super();
    }

    override fields() {
        return [
            this.make(Text, 'name').sortable(),
            this.make(Email, 'email').sortable(),
            // roles attach to a user through @repo/rbac, not a column: looked up per row, saved by update()
            this.make(
                Select,
                'role',
                async (user) =>
                    (await this.rbacService.rolesOf(userRef(user.id)))[0]
                        ?.name ?? null,
            )
                .options(Object.keys(ROLES))
                .nullable()
                .readonly(false)
                .showOnUpdating(),
            // set when creating only: an update ignores it, so the panel never changes a password
            this.make(Password, 'passwordHash', 'Password')
                .constraints({ minLength: 8 })
                .hideWhenUpdating(),
            this.make(DateTime, 'createdAt').sortable(),
            this.make(DateTime, 'updatedAt').sortable(),
            this.make(HasMany, 'posts'),
            this.make(HasMany, 'comments'),
        ];
    }

    // the columns named one by one, so the password hash never goes out
    override actions() {
        return csvExports<UserEntity>({
            filename: 'users',
            columns: {
                ID: (user) => user.id,
                Name: (user) => user.name,
                Email: (user) => user.email,
                'Created at': (user) => user.createdAt,
            },
        });
    }

    override cards() {
        return [
            new Value({ label: 'New users' }),
            new Trend({ label: 'Sign ups', chart: 'line' }),
        ];
    }

    override async create({ values, ...input }: CreateInput<UserEntity>) {
        return super.create({ ...input, values: await stored(values) });
    }

    override async update({ values, ...input }: UpdateInput<UserEntity>) {
        const { role, ...rest } = values as typeof values & {
            role?: string | null;
        };
        const user = await super.update({
            ...input,
            values: await stored(rest),
        });

        if (role !== undefined) await this.setRole({ id: user.id, role });

        return user;
    }

    // through UsersService, which also removes the media, roles and notifications no foreign key cascades to
    override async forceDelete({ keys }: DeleteRecordsInput<UserEntity>) {
        for (const id of keys)
            await this.usersService.delete({ id: Number(id) });

        return keys.length;
    }

    // one role a user, as the panel edits it: any other goes, the picked one is attached
    private async setRole({ id, role }: { id: number; role: string | null }) {
        const subject = userRef(id);
        const held = await this.rbacService.rolesOf(subject);

        for (const current of held)
            if (current.name !== role)
                await this.rbacService.detachRole({
                    roleId: current.id,
                    ...subject,
                });

        if (role && !held.some(({ name }) => name === role)) {
            const { id: roleId } = await this.rbacService.findRoleByName({
                name: role,
            });

            await this.rbacService.attachRole({ roleId, ...subject });
        }
    }
}
