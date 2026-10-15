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
 * Brings the roles up to date on every boot, and makes sure the ADMIN_EMAIL account exists and is an admin.
 * The account is created here rather than registered, as registering would let whoever came first claim it.
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

        const userId =
            (await this.usersService.findIdByEmail({ email: adminEmail })) ??
            (await this.createAdmin({
                email: adminEmail,
                password: adminPassword,
            }));
        const subject = userRef(userId);

        if (await this.rbacService.hasAnyRole({ subject, names: [ADMIN_ROLE] }))
            return;

        const { id: roleId } = await this.rbacService.findRoleByName({
            name: ADMIN_ROLE,
        });

        await this.rbacService.attachRole({ ...subject, roleId });
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
