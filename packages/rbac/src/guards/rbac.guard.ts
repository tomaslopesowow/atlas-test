import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/rbac.decorator.js';
import { RbacService } from '../rbac.service.js';
import type { ModelRef, PermissionName } from '../types/types.js';

/** Extended by the app, which decides who the subject of a request is. */
@Injectable()
export abstract class RbacGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rbacService: RbacService,
    ) {}

    /** Undefined for an anonymous request, which a protected route refuses with a 401. */
    protected abstract getSubject(
        context: ExecutionContext,
    ): ModelRef | undefined | Promise<ModelRef | undefined>;

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // per key, the handler's list replaces the controller's instead of merging with it
        const targets = [context.getHandler(), context.getClass()];
        const roles =
            this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets) ??
            [];
        const permissions =
            this.reflector.getAllAndOverride<PermissionName[]>(
                PERMISSIONS_KEY,
                targets,
            ) ?? [];

        if (roles.length === 0 && permissions.length === 0) return true;

        const subject = await this.getSubject(context);
        if (!subject) throw new UnauthorizedException();

        if (
            roles.length &&
            !(await this.rbacService.hasAnyRole({ ...subject, names: roles }))
        )
            return false;

        // an empty list requires nothing, and is granted without a query
        return this.rbacService.hasAllPermissions({
            ...subject,
            names: permissions,
        });
    }
}
