import { getPayloadClient } from '@/features/payload/client';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { getPageByPath } from '@/features/payload/local-api/get-page';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { ProductBasicType } from '@/features/shopify/api/fragments/product-basic.storefront';
import { getProductBasic } from '@/features/shopify/api/get-product-basic.storefront';
import { getLocalizationContext } from '@/features/shopify/utils/localization';
import type { Page } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import { type AppLocale, I18N_LOCALES } from '@repo/i18n/shared';
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
    const isEcommerce = process.env.NEXT_PUBLIC_ECOMMERCE === 'yes';

    const [payload, siteUrl, page, brand, localization] = await Promise.all([
        getPayloadClient(),
        getSiteUrl(),
        getPageByPath(pathname),
        getBrand(),
        isEcommerce ? getLocalizationContext() : Promise.resolve(null),
    ] as const);

    const shopifyProductId: string | null | undefined = isEcommerce
        ? // biome-ignore lint/suspicious/noExplicitAny: types fail when not bootstrapped as E_COMMERCE
          (page?.taxonomyData as any)?.product?.shopifyProductId
        : null;

    let product: ProductBasicType | null | undefined = null;
    let openGraph: Metadata['openGraph'] | undefined = undefined;
    const brandImage = asDoc(brand?.meta?.image);

    if (shopifyProductId) {
        product = await getProductBasic({
            id: shopifyProductId,
            ...localization,
        });
    }

    // Get all language versions of the page (including current locale for complete hreflang set)
    const allLocales = [...I18N_LOCALES] as AppLocale[];

    if (product?.featuredImage?.url) {
        const url = new URL(product.featuredImage.url);
        url.searchParams.set('width', '1200');
        url.searchParams.set('height', '630');
        openGraph = {
            images: [
                {
                    url,
                    alt: product.description,
                    width: 1200,
                    height: 630,
                },
            ],
        };
    } else if (brandImage?.url) {
        openGraph = {
            images: [
                {
                    url: brandImage.url,
                    alt:
                        brandImage.description ??
                        brand.shortDescription ??
                        brand.name ??
                        '',
                },
            ],
        };
    }

    // Construct social media metadata using brand image
    const socialMetadata: Metadata = {
        openGraph,
    };

    // Get alternate language versions of the page
    const languages = (
        await Promise.all(
            allLocales.map((locale) =>
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
                // Remove www prefix from all alternate language URLs
                acc[locale] = page.permalink.replace(
                    /^https?:\/\/www\./,
                    'https://',
                );
                return acc;
            },
            {} as Record<AppLocale, string>,
        );

    // Get canonical URL from current locale's language link (already non-www)
    const canonicalUrl = languages[locale];

    // Merge page-specific metadata with alternate languages
    const pageMetadata = merge(
        createMetadataFromSeoMeta(page?.meta),
        {
            alternates: {
                languages,
                ...(canonicalUrl && { canonical: canonicalUrl }),
            },
        } satisfies Metadata,
        (a, b) => (b === null ? a : undefined),
    );

    const brandMetadata = createMetadataFromSeoMeta(brand.meta);

    // Merge all metadata sources with fallbacks
    const mergedMetadata = merge(
        FALLBACK_METADATA,
        COMMON_METADATA,
        brandMetadata,
        pageMetadata,
        socialMetadata,
        (a, b) => (b === null ? a : undefined),
    );

    return { metadataBase: new URL(siteUrl), ...mergedMetadata };
}
