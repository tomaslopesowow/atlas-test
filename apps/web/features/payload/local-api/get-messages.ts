import type { AppLocale } from '@repo/i18n/shared';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { getPayloadClient } from '../client';

export const getMessages = cache(async (locale?: AppLocale) => {
    const [_locale, payload] = await Promise.all([
        locale ? Promise.resolve(locale) : getLocale(),
        getPayloadClient(),
    ]);

    return payload.findGlobal({
        slug: 'messages',
        locale: _locale as AppLocale,
    });
});
