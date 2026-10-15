import { Injectable } from '@nestjs/common';
import { AdminAuthenticator, type SessionInput } from '@repo/admin';
import { RbacService } from '@repo/rbac';
import { AuthService } from '../auth/auth.service.js';
import { type AuthRequest, userRef } from '../auth/current-user.js';
import { ADMIN_ROLE } from '../auth/permissions.js';
import { UsersService } from '../users/users.service.js';

/** The panel signs in as the api does; only an admin may use what it then asks for. */
@Injectable()
export class AdminLogin extends AdminAuthenticator {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
        private readonly rbacService: RbacService,
    ) {
        super();
    }

    async login({ email, password }: SessionInput) {
        // the limits of the api's own LoginInput, so no huge password is hashed
        if (email.length > 254 || password.length > 128) return null;

        // a wrong email or password throws a 401 itself
        const { token } = await this.authService.login({ email, password });

        return { token };
    }

    // the AuthGuard signed the request in, and left its user on it
    async authorize({ request }: { request: object }) {
        const id = (request as AuthRequest).user?.id;

        return (
            id !== undefined &&
            this.rbacService.hasAnyRole({
                ...userRef(id),
                names: [ADMIN_ROLE],
            })
        );
    }

    // the AuthGuard left the session's token on the request
    override async logout({ request }: { request: object }) {
        const token = (request as AuthRequest).user?.token;

        if (token) await this.authService.logout({ token });
    }

    // the AuthGuard left the signed-in user on the request; their name is kept as it is now
    override async actor({ request }: { request: object }) {
        const id = (request as AuthRequest).user?.id;

        if (id === undefined) return null;

        const { name } = await this.usersService.findProfile({ id });

        return { key: id, title: name, resource: 'user' };
    }
}
