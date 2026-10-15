import {
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard, RbacService, type RbacSubject } from '@repo/rbac';
import { AuthService } from './auth.service.js';
import { type AuthRequest, IS_PUBLIC, userRef } from './current-user.js';

const BEARER = /^Bearer (\S+)$/;

/**
 * Every route needs a session unless it is @Public(); then @HasRole() and @HasPermission() are checked
 * for the signed-in user. One guard, so the second never runs before the first.
 */
@Injectable()
export class AuthGuard extends RbacGuard {
    constructor(
        private readonly metadata: Reflector,

        rbacService: RbacService,

        private readonly authService: AuthService,
    ) {
        super(metadata, rbacService);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.metadata.getAllAndOverride<boolean>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<AuthRequest>();
        const [, token] =
            BEARER.exec(request.header('authorization') ?? '') ?? [];
        const userId = token
            ? await this.authService.authenticate({ token })
            : undefined;

        if (!token || !userId)
            throw new UnauthorizedException(
                'Sign in, and send the token as a Bearer',
            );

        request.user = { id: userId, token };

        return super.canActivate(context);
    }

    protected getSubject(context: ExecutionContext): RbacSubject | undefined {
        const { user } = context.switchToHttp().getRequest<AuthRequest>();

        return user && userRef(user.id);
    }
}
