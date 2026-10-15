import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Put,
} from '@nestjs/common';
import {
    HasPermission,
    RbacService,
    type RoleAttachmentOutput,
    type RoleOutput,
} from '@repo/rbac';
import { userRef } from '../auth/current-user.js';
import { Permission } from '../auth/permissions.js';
import { ParseIdPipe } from '../common/id.js';
import { RolesService } from './roles.service.js';

/** Who may do what; for admins. */
@Controller()
export class RolesController {
    constructor(
        private readonly rbacService: RbacService,

        private readonly rolesService: RolesService,
    ) {}

    @Get('roles')
    @HasPermission(Permission.ReadRoles)
    async list(): Promise<RoleOutput[]> {
        return this.rbacService.listRoles();
    }

    @Get('users/:id/roles')
    @HasPermission(Permission.ReadRoles)
    async rolesOf(
        @Param('id', ParseIdPipe) userId: number,
    ): Promise<RoleOutput[]> {
        return this.rbacService.rolesOf({ subject: userRef(userId) });
    }

    @Put('users/:id/roles/:roleId')
    @HasPermission(Permission.UpdateRoles)
    async grant(
        @Param('id', ParseIdPipe) userId: number,
        @Param('roleId', ParseIdPipe) roleId: number,
    ): Promise<RoleAttachmentOutput> {
        return this.rolesService.grant({ userId, roleId });
    }

    @Delete('users/:id/roles/:roleId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @HasPermission(Permission.UpdateRoles)
    async revoke(
        @Param('id', ParseIdPipe) userId: number,
        @Param('roleId', ParseIdPipe) roleId: number,
    ): Promise<void> {
        await this.rbacService.detachRole({ ...userRef(userId), roleId });
    }
}
