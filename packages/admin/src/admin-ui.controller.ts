import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Post,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { SessionInput, SessionResponse } from '@repo/admin-contract';
import { adminUiPath } from '@repo/admin-ui';
import { ResourceRegistry } from './registry/resource-registry.js';

/** The built panel and its sign-in, open to anyone: an app with a global guard marks this controller public. */
@Controller('admin')
export class AdminUiController {
    constructor(private readonly registry: ResourceRegistry) {}

    @Post('api/session')
    @HttpCode(200)
    async session(@Body() input: SessionInput): Promise<SessionResponse> {
        const authenticator = this.registry.authenticator();

        if (!authenticator)
            throw new NotFoundException(
                'No sign-in: no provider extends AdminAuthenticator',
            );

        const session =
            typeof input?.email === 'string' &&
            typeof input.password === 'string'
                ? await authenticator.login({
                      email: input.email,
                      password: input.password,
                  })
                : null;

        if (!session)
            throw new UnauthorizedException('The email or password is wrong');

        // the token alone, whatever else the app's login resolves with
        return { token: session.token };
    }

    @Get(['', '*path'])
    page(
        @Param('path') path: string[] | undefined,
        // what of Express's response this uses, typed here so the package needs no express
        @Res()
        response: {
            setHeader(name: string, value: string): void;
            sendFile(path: string, options: { root: string }): void;
        },
    ) {
        const file = posix.normalize((path ?? []).join('/'));

        const asset = file.startsWith('assets/');

        // an API path no route answered, or an asset of another build, is missing, not a page
        if (
            file === 'api' ||
            file.startsWith('api/') ||
            (asset && !existsSync(join(adminUiPath, file)))
        )
            throw new NotFoundException();

        // built assets carry their hash in their name, so they never change; the page always might

        response.setHeader(
            'Cache-Control',
            asset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
        // root keeps the path inside the build, whatever it says
        response.sendFile(asset ? file : 'index.html', { root: adminUiPath });
    }
}
