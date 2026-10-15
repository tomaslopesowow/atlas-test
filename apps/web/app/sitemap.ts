import config from '@payload-config';
import {
    type AppLocale,
    getAlternateLocales,
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
} from '@repo/i18n/shared';
import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import type { Page } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const payload = await getPayload({ config });
    const entries: MetadataRoute.Sitemap = [];

    /**
     * Initialize pages array for each locale,
     * this will be used to store all pages for each locale
     *
     * @example
     * {
     *  en: [Page, Page, ...],
     *  nl: [Page, Page, ...],
     * }
     */
    const pages = I18N_LOCALES.reduce<Record<AppLocale, Page[]>>(
        (acc, locale) => {
            acc[locale] = [];
            return acc;
        },
        {} as Record<AppLocale, Page[]>,
    );

    // Iterate through each configured locale (e.g. 'en', 'nl')
    for (const locale of I18N_LOCALES) {
        // Initialize pagination variables
        let page = 1;
        let hasNextPage = false;

        do {
            // Fetch a batch of pages from Payload CMS for current locale
            // Limit set to 1000 to handle pagination in large chunks
            const paginatedPages = await payload.find({
                collection: 'pages',
                limit: 1000,
                locale,
                page,
            });

            // Increment page counter for next iteration
            page++;

            // Check if there are more pages to fetch
            hasNextPage = paginatedPages.hasNextPage;

            // Add the fetched pages to our locale-specific array
            // Type assertion needed since payload.find returns generic docs
            pages[locale].push(...(paginatedPages.docs as Page[]));
        } while (hasNextPage); // Continue fetching until no more pages
    }

    // Iterate through pages in the default locale to create sitemap entries
    for (const defaultLocalePage of pages[I18N_DEFAULT_LOCALE]) {
        // Extract permalink as URL and updatedAt timestamp from default locale page
        const url = defaultLocalePage.permalink;

        // Skip processing if page has no permalink defined
        if (!url) continue;

        // Track most recent update time, starting with default locale's timestamp
        let lastModified = defaultLocalePage.updatedAt;

        // Build a map of alternate language URLs for this page
        // This creates an object like: { en: '/en/some-page', nl: '/nl/some-page' }
        const languages: Record<AppLocale, string> =
            // Need to cast to AppLocale[], because single locale yields a never[]
            (getAlternateLocales(I18N_DEFAULT_LOCALE) as AppLocale[]).reduce(
                (acc, alternateLocale) => {
                    // Find the corresponding page in the alternate locale
                    const alternatePage = pages[alternateLocale].find(
                        (page) => page.id === defaultLocalePage.id,
                    );

                    // Skip if no permalink exists for this locale
                    if (!alternatePage?.permalink) return acc;

                    // Update the lastModified date if the alternate page was updated more recently
                    if (alternatePage.updatedAt > lastModified) {
                        lastModified = alternatePage.updatedAt;
                    }

                    // Add the alternate locale URL to the accumulator
                    acc[alternateLocale] = alternatePage.permalink;
                    return acc;
                },
                {} as Record<AppLocale, string>,
            );

        // Create a sitemap entry with:
        // - The page URL
        // - The most recent modification date across all locales
        // - Alternate language versions of the page
        const entry: MetadataRoute.Sitemap[number] = {
            url,
            lastModified,
            alternates: { languages },
        };

        entries.push(entry);
    }

    return entries;
}
