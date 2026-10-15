import 'server-only';

import type { AppLocale } from '@repo/i18n/shared';
import { headers } from 'next/headers';

export const createLocalizedURL = async (
    locale: AppLocale,
    ...pathSegments: (string | null | undefined)[]
) => {
    const host = (await headers()).get('host') ?? '';
    const protocol = (await headers()).get('x-forwarded-proto') ?? 'http';

    const url = new URL(
        [locale, ...pathSegments.filter(Boolean)].join('/'),
        `${protocol}://${host}`,
    );

    return url;
};
