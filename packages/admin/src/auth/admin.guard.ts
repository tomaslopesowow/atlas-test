import {
    type CanActivate,
    type ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ResourceRegistry } from '../registry/resource-registry.js';

/** Lets a request through to the admin API only when the app's AdminAuthenticator authorizes it. */
@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private readonly registry: ResourceRegistry) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const authenticator = this.registry.authenticator();

        // without a sign-in, no one could be told apart, so no one gets in
        if (!authenticator)
            throw new ForbiddenException(
                'No sign-in: no provider extends AdminAuthenticator',
            );

        return authenticator.authorize({
            request: context.switchToHttp().getRequest<object>(),
        });
    }
}
