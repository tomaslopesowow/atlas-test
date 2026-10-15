import {
    createParamDecorator,
    type ExecutionContext,
    SetMetadata,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/** The signed-in user, as the auth guard puts it on the request. */
export interface AuthUser {
    id: number;
    /** The session's token, which logging out revokes. */
    token: string;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

/** A user as the packages refer to a model: media and roles attach to it, notifications are owned by it. */
export interface UserRef {
    modelType: 'user';
    modelId: number;
}

export const userRef = (id: number): UserRef => ({
    modelType: 'user',
    modelId: id,
});

export const IS_PUBLIC = 'auth:public';

/** Lets a route through without signing in; every other route needs a session. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** The signed-in user; a route reached without one is a bug in the guard. */
export const CurrentUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext): AuthUser => {
        const { user } = context.switchToHttp().getRequest<AuthRequest>();

        if (!user) throw new UnauthorizedException();

        return user;
    },
);
