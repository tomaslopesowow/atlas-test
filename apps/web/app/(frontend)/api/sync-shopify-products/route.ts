import { getPayloadClient } from '@/features/payload/client';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import type { ProductBasicType } from '@/features/shopify/api/fragments/product-basic.storefront';
import { getProductBasic } from '@/features/shopify/api/get-product-basic.storefront';
import { getProductsBasic } from '@/features/shopify/api/get-products-basic.storefront';
import type { User } from '@/payload-types';
import { type AppLocale, I18N_LOCALES } from '@repo/i18n/shared';
import type { LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import { notFound } from 'next/navigation';
import type { Payload, RequiredDataFromCollectionSlug } from 'payload';
import type { MarkOptional } from 'ts-essentials';

const PRODUCTS_PAGE_SIZE = 10; // Number of products to fetch per request

/**
 * Handles POST request to sync product pages
 */
export async function POST(request: Request) {
    const { payload, user } = await validateRequest(request);

    for (const locale of I18N_LOCALES) {
        const language = locale.toUpperCase() as LanguageCode;

        // Initial structure for pagination results
        let result: Awaited<ReturnType<typeof getProductsBasic>> = {
            products: [],
            hasNextPage: false,
            endCursor: null,
        };

        // Fetch and process products page by page
        do {
            result = await getProductsBasic({
                language,
                first: PRODUCTS_PAGE_SIZE,
                after: result.endCursor,
            });

            // Log all products being synced
            payload.logger.info(
                result.products
                    .map(
                        (product) =>
                            `Syncing product | ${locale} | ${product.id}...`,
                    )
                    .join('\n'),
            );

            // Process all products in parallel and wait for completion
            await Promise.all(
                result.products.map((product) =>
                    syncProductPage({ payload, product, locale, user }),
                ),
            );

            // Log all successful syncs
            payload.logger.info(
                result.products
                    .map(
                        (product) =>
                            `Product | ${locale} | ${product.id} synced successfully!`,
                    )
                    .join('\n'),
            );
        } while (result.hasNextPage);
    }

    return Response.json({
        message: 'Product pages synced successfully.',
    });
}

/**
 * Handles GET request to sync a specific product page
 */
export async function GET(request: Request) {
    const { payload } = await validateRequest(request);
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('page') ?? '';

    // Fetch the page details from the database
    const page = (await payload.findByID({
        collection: 'pages',
        id: pageId,
        select: {
            taxonomyData: { product: true },
        },
    })) as PageWithGenericTaxonomies;

    if (!page.taxonomyData?.product?.shopifyProductId) notFound(); // Return 404 if the product ID is missing

    for (const locale of I18N_LOCALES) {
        const language = locale.toUpperCase() as LanguageCode;

        // Fetch the product details from Shopify
        const product = await getProductBasic({
            id: page.taxonomyData?.product?.shopifyProductId,
            language,
        });

        if (!product) notFound(); // Return 404 if product data is not found

        await updateProductPage({ payload, product, locale, pageId: page.id });
    }

    return Response.json({
        message: 'Product page synced successfully.',
    });
}

/**
 * Validates the request and retrieves authentication data
 */
export async function validateRequest(request: Request) {
    if (process.env.NEXT_PUBLIC_ECOMMERCE !== 'yes') notFound(); // Ensure e-commerce feature is enabled

    const payload = await getPayloadClient();
    const { user } = await payload.auth(request);

    if (!user) {
        throw Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return { payload, user };
}

/**
 * Updates an existing product page with new data
 */
async function updateProductPage({
    payload,
    locale,
    product,
    pageId,
}: {
    payload: Payload;
    locale: AppLocale;
    product: ProductBasicType;
    pageId: string;
}) {
    const data = createPageData({ product });

    return payload.update({
        collection: 'pages',
        locale,
        where: { id: { equals: pageId } },
        data,
    });
}

/**
 * Creates a new product page
 */
async function createProductPage({
    payload,
    locale,
    product,
    user,
}: {
    payload: Payload;
    locale: AppLocale;
    product: ProductBasicType;
    user: User;
}) {
    const [productPageData, template] = await Promise.all([
        createPageData({ product }),
        payload
            .find({
                collection: 'page-templates',
                where: { title: { equals: 'Product' } },
                limit: 1,
                depth: 0,
            })
            .then(({ docs }) => docs.at(0)),
    ]);

    const createData: MarkOptional<
        PageWithGenericTaxonomies,
        'createdAt' | 'updatedAt' | 'id'
    > = {
        ...productPageData,
        createdBy: user,
        template,
        taxonomyType: 'product',
        taxonomyData: {
            product: {
                shopifyProductId: product.id,
            },
        },
    };

    return payload.create({
        collection: 'pages',
        locale,
        data: createData,
    });
}

/**
 * Syncs a product page by either updating an existing page or creating a new one
 */
async function syncProductPage({
    payload,
    locale,
    product,
    user,
}: {
    payload: Payload;
    locale: AppLocale;
    product: ProductBasicType;
    user: User;
}) {
    // Find if the product page already exists
    const page = await payload
        .find({
            collection: 'pages',
            where: {
                'taxonomyData.product.shopifyProductId': { equals: product.id },
            },
            limit: 1,
            depth: 0,
            draft: true,
        })
        .then(({ docs }) => docs.at(0));

    return page
        ? updateProductPage({ payload, product, locale, pageId: page.id })
        : createProductPage({ payload, product, locale, user });
}

/**
 * Creates a new page data object, including Shopify product taxonomy data
 */
function createPageData({
    product,
}: { product?: ProductBasicType }): RequiredDataFromCollectionSlug<'pages'> {
    if (!product) {
        return { _status: 'draft' } as RequiredDataFromCollectionSlug<'pages'>;
    }

    return {
        title: product.title,
        slug: product.handle,
        slugLock: false,
        taxonomyData: {
            product: {
                shopifyProductId: product.id,
            },
        },
        meta: {
            title: product.seo.title,
            description: product.seo.description,
        },
        _status: 'published',
    };
}
