import {
    Inject,
    Injectable,
    type OnApplicationBootstrap,
} from '@nestjs/common';
import { RbacService } from '@repo/rbac';
import { userRef } from '../auth/current-user.js';
import { hashPassword } from '../auth/password.js';
import { ADMIN_ROLE, ROLES } from '../auth/permissions.js';
import { type AppConfig, appConfig } from '../config/app.config.js';
import type { AdminAccountInput } from '../types/types.js';
import { UsersService } from '../users/users.service.js';

const MIN_PASSWORD = 8;

/**
 * Brings the roles up to date on every boot, and creates the ADMIN_EMAIL account as an admin when it does not exist.
 * An account that already has the email is never made admin: registration is open, so anyone could have taken it.
 */
@Injectable()
export class RolesSeeder implements OnApplicationBootstrap {
    constructor(
        private readonly rbacService: RbacService,

        private readonly usersService: UsersService,

        @Inject(appConfig.KEY)
        private readonly config: AppConfig,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        for (const [name, permissions] of Object.entries(ROLES))
            await this.rbacService.ensureRole({ name, permissions });

        await this.ensureAdmin();
    }

    private async ensureAdmin(): Promise<void> {
        const { adminEmail, adminPassword } = this.config;

        if (!adminEmail) return;

        const existing = await this.usersService.findIdByEmail({
            email: adminEmail,
        });

        if (existing !== undefined) {
            if (
                !(await this.rbacService.hasAnyRole({
                    ...userRef(existing),
                    names: [ADMIN_ROLE],
                }))
            )
                throw new Error(
                    `ADMIN_EMAIL is ${adminEmail}, which an account that is no admin already has: give it the admin role in the panel, or set another ADMIN_EMAIL`,
                );

            return;
        }

        const userId = await this.createAdmin({
            email: adminEmail,
            password: adminPassword,
        });
        const { id: roleId } = await this.rbacService.findRoleByName({
            name: ADMIN_ROLE,
        });

        await this.rbacService.attachRole({ ...userRef(userId), roleId });
    }

    // the password is only read the first time, when the account does not exist yet
    private async createAdmin({
        email,
        password,
    }: AdminAccountInput): Promise<number> {
        if (!password || password.length < MIN_PASSWORD)
            throw new Error(
                `ADMIN_PASSWORD, of at least ${MIN_PASSWORD} characters, is needed to create the ${email} account`,
            );

        const { id } = await this.usersService.create({
            email,
            name: 'Admin',
            passwordHash: await hashPassword({ password }),
        });

        return id;
    }
}
