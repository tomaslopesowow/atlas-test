import { getPayloadClient } from '@/features/payload/client';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { getPageByPath } from '@/features/payload/local-api/get-page';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Page } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import { type AppLocale, getAlternateLocales } from '@repo/i18n/shared';
import merge from 'lodash.mergewith';
import type { Metadata } from 'next';
import type { AnyPageProps } from '../shared';
import { parsePagePathname } from '../utils/parse-page-pathname';
import { createMetadataFromSeoMeta } from './from-seo-meta';
import { COMMON_METADATA, FALLBACK_METADATA } from './shared';

/**
 * Retrieves and constructs metadata for a page, including SEO meta, social media metadata,
 * and alternate language versions.
 *
 * @param props - Page props containing parameters and search params
 * @returns Promise resolving to Next.js Metadata object
 */
export async function getPageMetadata(props: AnyPageProps): Promise<Metadata> {
    // Fetch required data in parallel
    const params = await props.params;
    const locale = params.locale;
    const pathname = parsePagePathname(params);

    const [payload, siteUrl, page, brand] = await Promise.all([
        getPayloadClient(),
        getSiteUrl(),
        getPageByPath(pathname),
        getBrand(),
    ] as const);

    const brandImage = asDoc(brand?.meta?.image);

    // Construct social media metadata using brand image
    const socialMetadata: Metadata = {
        openGraph: brandImage?.url
            ? {
                  images: [
                      {
                          url: brandImage.url,
                          width: brandImage.width ?? undefined,
                          height: brandImage.height ?? undefined,
                          alt: brandImage.description ?? undefined,
                      },
                  ],
              }
            : undefined,
    };

    // Get alternate language versions of the page
    const languages = (
        await Promise.all(
            (getAlternateLocales(locale) as AppLocale[]).map((locale) =>
                page
                    ? payload
                          .findByID({
                              collection: 'pages',
                              id: page.id,
                              locale: locale as AppLocale,
                              depth: 0,
                              select: { permalink: true, path: true },
                          })
                          .then((res) => ({
                              page: res as Page,
                              locale,
                          }))
                    : Promise.resolve(null),
            ),
        )
    )
        .filter((result): result is NonNullable<typeof result> => !!result)
        .reduce<Record<AppLocale, string>>(
            (acc, { page, locale }) => {
                if (!page.permalink) return acc;
                acc[locale] = page.permalink;
                return acc;
            },
            {} as Record<AppLocale, string>,
        );

    // Merge page-specific metadata with alternate languages
    const pageMetadata = merge(
        createMetadataFromSeoMeta(page?.meta),
        { alternates: { languages } } satisfies Metadata,
        (a, b) => (b === null ? a : undefined),
    );

    const brandMetadata = createMetadataFromSeoMeta(brand.meta);

    // Merge all metadata sources with fallbacks
    const mergedMetadata = merge(
        FALLBACK_METADATA,
        COMMON_METADATA,
        pageMetadata,
        brandMetadata,
        socialMetadata,
        (a, b) => (b === null ? a : undefined),
    );

    return { metadataBase: new URL(siteUrl), ...mergedMetadata };
}
