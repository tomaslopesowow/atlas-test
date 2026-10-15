import { type AppLocale, I18N_LOCALES } from '@repo/i18n/shared';
import type { LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { Payload, PayloadRequest } from 'payload';
import type { ProductBasicType } from '@/api/fragments/product-basic.storefront';
import { getProductBasic } from '@/api/get-product-basic.storefront';
import { getProductsBasic } from '@/api/get-products-basic.storefront';

const PRODUCTS_PAGE_SIZE = 10;

type SyncUser = NonNullable<PayloadRequest['user']>;

// biome-ignore lint/suspicious/noExplicitAny: page data is validated by Payload against the app's generated collection types at runtime
type PageData = Record<string, any>;

export async function syncAllProductPages({
    payload,
    user,
}: {
    payload: Payload;
    user: SyncUser;
}) {
    for (const locale of I18N_LOCALES) {
        const language = locale.toUpperCase() as LanguageCode;

        let result: Awaited<ReturnType<typeof getProductsBasic>> = {
            products: [],
            hasNextPage: false,
            endCursor: null,
        };

        do {
            result = await getProductsBasic({
                language,
                first: PRODUCTS_PAGE_SIZE,
                after: result.endCursor,
            });

            payload.logger.info(
                result.products
                    .map(
                        (product) =>
                            `Syncing product | ${locale} | ${product.id}...`,
                    )
                    .join('\n'),
            );

            await Promise.all(
                result.products.map((product) =>
                    syncProductPage({ payload, product, locale, user }),
                ),
            );

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
}

export async function syncProductPageById({
    payload,
    pageId,
}: {
    payload: Payload;
    pageId: string;
}) {
    const page = (await payload.findByID({
        collection: 'pages',
        id: pageId,
        select: {
            taxonomyData: { product: true },
        } as never,
    })) as PageData;

    const shopifyProductId = page.taxonomyData?.product?.shopifyProductId as
        | string
        | undefined;

    if (!shopifyProductId) return false;

    for (const locale of I18N_LOCALES) {
        const language = locale.toUpperCase() as LanguageCode;

        const product = await getProductBasic({
            id: shopifyProductId,
            language,
        });

        if (!product) return false;

        await updateProductPage({ payload, product, locale, pageId: page.id });
    }

    return true;
}

async function updateProductPage({
    payload,
    locale,
    product,
    pageId,
}: {
    payload: Payload;
    locale: AppLocale;
    product: ProductBasicType;
    pageId: string | number;
}) {
    const data = createPageData({ product });

    return payload.update({
        collection: 'pages',
        locale,
        where: { id: { equals: pageId } },
        data,
    });
}

async function createProductPage({
    payload,
    locale,
    product,
    user,
}: {
    payload: Payload;
    locale: AppLocale;
    product: ProductBasicType;
    user: SyncUser;
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

    const createData: PageData = {
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

async function syncProductPage({
    payload,
    locale,
    product,
    user,
}: {
    payload: Payload;
    locale: AppLocale;
    product: ProductBasicType;
    user: SyncUser;
}) {
    const page = await payload
        .find({
            collection: 'pages',
            where: {
                'taxonomyData.product.shopifyProductId': {
                    equals: product.id,
                },
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

function createPageData({ product }: { product?: ProductBasicType }): PageData {
    if (!product) {
        return { _status: 'draft' };
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
