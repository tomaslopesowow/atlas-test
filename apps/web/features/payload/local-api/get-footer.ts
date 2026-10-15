import type { AppLocale } from '@repo/i18n/shared';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { getPayloadClient } from '../client';

export const getFooter = cache(async () => {
    const [locale, payload] = await Promise.all([
        getLocale(),
        getPayloadClient(),
    ]);

    return payload.findGlobal({
        slug: 'footer',
        locale: locale as AppLocale,
    });
});
