import { blocksRegistry } from '@/features/blocks/registry';
import { ProductList } from '@/features/payload/blocks/product-list.ecommerce';
import { storefrontQuery } from '@/features/shopify/api/client';
import { PageInfo } from '@/features/shopify/api/fragments/pageinfo.storefront';
import { ProductListItem } from '@/features/shopify/api/fragments/product-listitem.storefront';
import { graphql } from '@/features/shopify/api/graphql.storefront';
import { ProductFilterProvider } from '@/features/shopify/components/product-filter-context';
import { getLocalizationContext } from '@/features/shopify/utils/localization';
import { extractIdFromGid } from '@repo/lib-shopify/extract-id-from-gid';
import type {
    ProductCollectionSortKeys,
    ProductFilter,
    ProductSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import type { ResultOf, VariablesOf } from 'gql.tada';
import type { Maybe } from 'graphql/jsutils/Maybe';
import { ProductListClient } from './product-list.ecommerce.client';

const PAGE_SIZE = 12;

export const GetProductsListQuery = graphql(
    `query GetProductsList(
        $first: Int,
        $last: Int,
        $before: String,
        $after: String,
        $query: String,
        $reverse: Boolean,
        $sortKey: ProductSortKeys,
        $country: CountryCode,
        $language: LanguageCode
    ) @inContext(country: $country, language: $language) {
        products(
            first: $first,
            last: $last,
            before: $before,
            after: $after,
            query: $query,
            reverse: $reverse,
            sortKey: $sortKey
        ) {
            nodes { ...productListItem }
            pageInfo {
                ...pageInfo
            }
        }
    }`,
    [ProductListItem, PageInfo],
);

export const GetProductsByCollectionIdQuery = graphql(
    `query GetCollectionById(
        $id: ID!,
        $first: Int,
        $last: Int,
        $before: String,
        $after: String,
        $reverse: Boolean,
        $sortKey: ProductCollectionSortKeys,
        $filters: [ProductFilter!],
        $language: LanguageCode,
        $country: CountryCode
    ) @inContext(language: $language, country: $country) {
        collection(id: $id) {
            products(
                first: $first,
                last: $last,
                before: $before,
                after: $after,
                reverse: $reverse,
                sortKey: $sortKey,
                filters: $filters,
            ) {
                nodes { ...productListItem }
                pageInfo {
                    ...pageInfo
                }
            }
        }
    }`,
    [ProductListItem, PageInfo],
);

export const getProductList = async (params: {
    shopifyCollectionId: Maybe<string>;
    shopifyProductIds: Maybe<string[]>;
    type: 'collection' | 'products';
    filter?: {
        available?: string;
        unavailable?: string;
    };
    sort?: string;
}) => {
    const { shopifyCollectionId, shopifyProductIds, type, filter, sort } =
        params;

    const { country, language } = await getLocalizationContext();

    let result: Maybe<
        | ResultOf<typeof GetProductsListQuery>
        | ResultOf<typeof GetProductsByCollectionIdQuery>
    > = null;

    let query:
        | typeof GetProductsListQuery
        | typeof GetProductsByCollectionIdQuery = GetProductsListQuery;

    let variables: Partial<
        | VariablesOf<typeof GetProductsListQuery>
        | VariablesOf<typeof GetProductsByCollectionIdQuery>
    > = {
        first: PAGE_SIZE,
        language,
        country,
    };

    if (type === 'collection' && !!shopifyCollectionId) {
        const filters = [
            filter?.available === 'on' && { available: true },
            filter?.unavailable === 'on' && { available: false },
        ].filter(Boolean) as ProductFilter[];

        const sortMap: Record<string, ProductCollectionSortKeys> = {
            'best-selling': 'BEST_SELLING',
            price: 'PRICE',
            '-price': 'PRICE',
            title: 'TITLE',
            '-title': 'TITLE',
            manual: 'MANUAL',
        };

        result = await storefrontQuery({
            query: (query = GetProductsByCollectionIdQuery),
            variables: (variables = {
                ...variables,
                id: shopifyCollectionId,
                filters,
                reverse: sort ? !!sortMap[sort] && sort.startsWith('-') : false,
                sortKey: sort ? sortMap[sort] : 'COLLECTION_DEFAULT',
            }) as VariablesOf<typeof GetProductsByCollectionIdQuery>,
        });
    }

    if (type === 'products' && !!shopifyProductIds?.length) {
        const sortMap: Record<string, ProductSortKeys> = {
            'best-selling': 'BEST_SELLING',
            price: 'PRICE',
            '-price': 'PRICE',
            title: 'TITLE',
            '-title': 'TITLE',
        };

        const sortKey = sort ? sortMap[sort] : 'BEST_SELLING';

        const productIdsQuery = `(${shopifyProductIds
            .map((id) => `id:${extractIdFromGid(id)}`)
            .join(' OR ')})`;

        const filterQuery = `(${[
            filter?.available === 'on' && 'available_for_sale:true',
            filter?.unavailable === 'on' && 'available_for_sale:false',
        ]
            .filter(Boolean)
            .join(' OR ')})`;

        result = await storefrontQuery({
            query: (query = GetProductsListQuery),
            variables: (variables = {
                ...variables,
                sortKey,
                query: [filterQuery, productIdsQuery]
                    .filter(Boolean)
                    .join(' AND '),
            }) as VariablesOf<typeof GetProductsListQuery>,
        });
    }

    return { query, variables, result, params };
};

blocksRegistry.addBlock(ProductList.slug, {
    component: async ({
        block: { type, shopifyProductIds, shopifyCollectionId },
        pageProps,
    }) => {
        if (!type) return null;

        const searchParams = await pageProps.searchParams;
        const sort = searchParams.sort as string | undefined;

        const filter = Object.entries(searchParams || {})
            .filter(([key]) => key.startsWith('filter.'))
            .reduce(
                (acc, [key, value]) => {
                    const filterName = key.replace('filter.', '');
                    acc[filterName] = value as string;
                    return acc;
                },
                {} as Record<string, string>,
            );

        return (
            <ProductFilterProvider initialState={{ filter, sort }}>
                <div>
                    <ProductListClient
                        initialConfig={getProductList({
                            type,
                            shopifyCollectionId,
                            shopifyProductIds,
                            filter,
                            sort,
                        })}
                    />
                </div>
            </ProductFilterProvider>
        );
    },
});
