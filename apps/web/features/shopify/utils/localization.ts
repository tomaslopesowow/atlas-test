import type {
    CountryCode,
    LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import { getLocale } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { SHOPIFY_DEFAULT_COUNTRY } from '../config/shared';

/**
 * Get the localization context for the current request.
 *
 * This function returns an object with the following properties:
 * - `country`: The country code of the current request.
 * - `language`: The language code of the current request.
 */
export const getLocalizationContext = cache(async () => {
    const [cookiesList, headersList, locale] = await Promise.all([
        cookies(),
        headers(),
        getLocale(),
    ]);

    const countryFromCookie = cookiesList.get('country')?.value;
    const countryFromHeader = headersList.get('x-country-code');
    const language = locale.toUpperCase() as LanguageCode;

    let country = SHOPIFY_DEFAULT_COUNTRY as CountryCode;

    if (countryFromCookie) {
        country = countryFromCookie as CountryCode;
    } else if (countryFromHeader) {
        country = countryFromHeader as CountryCode;
    }

    return {
        country,
        language,
    };
});
