import type { AppLocale } from '@repo/i18n/shared';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { getPayloadClient } from '../client';

export const getBrand = cache(async () => {
    const [locale, payload] = await Promise.all([
        getLocale(),
        getPayloadClient(),
    ]);

    return payload.findGlobal({
        slug: 'brand',
        locale: locale as AppLocale,
    });
});
