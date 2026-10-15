import {
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
    I18N_LOCALE_PREFIX,
} from '@repo/i18n/shared';
import createNextIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const nextIntlMiddleware = createNextIntlMiddleware({
    locales: I18N_LOCALES,
    defaultLocale: I18N_DEFAULT_LOCALE,
    localePrefix: I18N_LOCALE_PREFIX,
    alternateLinks: false, // alternate links are handled in metadata
});

// Match file paths and system paths
const FILE_PATH_EXP = /\.[^/]+$/;
const SYSTEM_PATH_EXP =
    /^\/(?:admin|_next|api|robots\.txt|sitemap\.xml)(?:\/|$)/;

export async function proxy(request: NextRequest) {
    // Return 404 for favicon.ico as favicon is handled in the layout
    if (request.nextUrl.pathname === '/favicon.ico') {
        return new NextResponse('Favicon not found', { status: 404 });
    }

    // Block direct access to admin assets.

    if (request.nextUrl.pathname.startsWith('/admin-assets')) {
        // TODO: This is a temporary solution to block direct access to admin assets
        // because the payload client can not be initialized in the middleware.
        // This is a limitation of Next.js 15.4.4, and should be resolved in 15.5.

        const authUrl = new URL('/api/auth/verify', request.nextUrl.origin);

        authUrl.searchParams.set(
            'token',
            request.cookies.get('payload-token')?.value ?? '',
        );

        const isValid = await fetch(authUrl, {
            method: 'POST',
        }).then((response) => response.ok);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        return NextResponse.next();
    }

    // Skip middleware for file paths and system paths
    if (
        FILE_PATH_EXP.test(request.nextUrl.pathname) ||
        SYSTEM_PATH_EXP.test(request.nextUrl.pathname)
    ) {
        return NextResponse.next();
    }

    // Run middleware for all other paths...

    // Create a response with the next-intl middleware
    const nextIntlResponse = nextIntlMiddleware(request);

    // Apply other middlewares here if needed...

    // Return the response
    return nextIntlResponse;
}
