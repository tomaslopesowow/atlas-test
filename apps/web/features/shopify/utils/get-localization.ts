import { type AppLocale, I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import { headers } from 'next/headers';
import { cache } from 'react';
import { getPreferredCountry } from './get-preferred-country';

export const getLocalization = cache(async () => {
    const locale = ((await headers()).get('x-next-intl-locale') ||
        I18N_DEFAULT_LOCALE) as AppLocale;
    const country = await getPreferredCountry('NL');
    const language = locale.toUpperCase() as LanguageCode;

    return {
        country,
        language,
    };
});
