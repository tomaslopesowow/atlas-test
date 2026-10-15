import { Injectable } from '@nestjs/common';
import { NotificationService } from '@repo/notifications';
import { RbacService, type RoleAttachmentOutput } from '@repo/rbac';
import { userRef } from '../auth/current-user.js';
import { RoleGrantedNotification } from '../notifications/role-granted.notification.js';
import type { GrantRoleInput } from '../types/types.js';

@Injectable()
export class RolesService {
    constructor(
        private readonly rbacService: RbacService,

        private readonly notificationService: NotificationService,
    ) {}

    /** Give a user a role and tell them; rbac cannot, as it knows nothing of notifications. */
    async grant({
        userId,
        roleId,
    }: GrantRoleInput): Promise<RoleAttachmentOutput> {
        const attachment = await this.rbacService.attachRole({
            ...userRef(userId),
            roleId,
        });

        await this.notificationService.send({
            recipients: [userRef(userId)],
            notification: new RoleGrantedNotification({
                role: attachment.role.name,
            }),
        });

        return attachment;
    }
}
