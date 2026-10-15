import { I18N_DEFAULT_LOCALE, I18N_LOCALE_PREFIX } from '@repo/i18n/shared';
import { permanentRedirect, redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import type { Page } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import { getPayloadClient } from '../client';

export const getRedirectsByPath = cache(async (pathname: string) => {
    const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

    const [payload, locale, siteUrl] = await Promise.all([
        getPayloadClient(),
        getLocale(),
        getSiteUrl(),
    ]);

    // Create the list of potential redirect paths to match against
    let matchRedirectsFrom: string[] = [];

    // Add the path to the matchRedirectsFrom array based on the locale prefix
    switch (I18N_LOCALE_PREFIX) {
        // Add the path without locale prefix
        case 'never':
            matchRedirectsFrom.push(pathnameWithoutLocale);
            break;

        // Add the path with locale prefix if it's not the default locale
        case 'as-needed':
            matchRedirectsFrom.push(
                locale === I18N_DEFAULT_LOCALE
                    ? pathnameWithoutLocale
                    : pathname,
            );
            break;

        // Add the path with locale prefix for all locales (default + 'always' behavior)
        default:
            matchRedirectsFrom.push(pathname);
    }

    // Add the path and the full URL to the matchRedirectsFrom array
    matchRedirectsFrom = matchRedirectsFrom.flatMap((path) => [
        path,
        String(new URL(path, siteUrl)),
    ]);

    // Initiate multiple requests in parallel, so we do not use `await` for each request,
    // instead we await the `Promise.all` below

    // Find a matching redirect in payload
    return payload
        .find({
            collection: 'redirects',
            limit: 1,
            where: {
                from: {
                    in: matchRedirectsFrom,
                },
            },
        })
        .then((res) => {
            // Handle the response, and perform the redirect
            // nextjs redirects will throw an error, which will short-circuit the page request

            const doc = res?.docs?.[0];

            if (!doc) return;

            const redirectFn =
                doc.type === '308' ? permanentRedirect : redirect;

            const redirectTo =
                doc.to?.type === 'reference'
                    ? (doc.to?.reference?.value as Page)?.permalink
                    : doc.to?.url;

            if (redirectTo) redirectFn(redirectTo);
        });
});
