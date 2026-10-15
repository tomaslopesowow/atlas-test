import type { AppLocale } from '@repo/i18n/shared';
import { createLocalizedURL } from '@/utils/create-localized-url';

/**
 * Creates alternate language canonicals for a set of data.
 *
 * @template TFromData - The type of the input data array.
 * @param {TFromData} data - The array of data to process.
 * @param {function(TFromData[number]): AppLocale} localeSelector - A function that selects the locale from each data item.
 * @param {function(TFromData[number]): (string | null | undefined)[]} pathSegments - A function that returns an array of path segments for each data item.
 * @returns {AlternateURLs['languages']} An object mapping locales to their corresponding localized URLs.
 */
export const createAlternateLanguageCanonicals = async <
    TFromData extends unknown[],
>(
    data: TFromData,
    localeSelector: (data: TFromData[number]) => AppLocale,
    pathSegments: (
        data: TFromData[number],
        locale: AppLocale,
    ) => (string | null | undefined)[],
): Promise<Record<AppLocale, string>> => {
    const result: Record<string, string> = {};

    for (const item of data) {
        const locale = localeSelector(item);
        const segments = pathSegments(item, locale);
        const url = await createLocalizedURL(locale, ...segments);
        result[locale] = url.toString();
    }

    return result;
};
