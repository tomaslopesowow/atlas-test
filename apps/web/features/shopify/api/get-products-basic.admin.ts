import { readFragment, type VariablesOf } from 'gql.tada';
import { storefrontQuery } from '@/features/shopify/api/client';
import { ProductBasicFragment } from '@/features/shopify/api/fragments/product-basic.admin';
import { graphql } from '@/features/shopify/api/graphql.admin';

export type GetProductsBasicParams = VariablesOf<typeof GetProductsBasicQuery>;

export const GetProductsBasicQuery = graphql(
    `query ProductsBasic($first: Int!, $after: String) {
        products(first: $first, after: $after) {
            nodes { ...productBasic }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }`,
    [ProductBasicFragment],
);

export const getProductsBasic = (variables: GetProductsBasicParams) =>
    storefrontQuery({ query: GetProductsBasicQuery, variables }, (data) => ({
        products: readFragment(
            ProductBasicFragment,
            data?.products.nodes ?? [],
        ),
        hasNextPage: data?.products.pageInfo.hasNextPage ?? false,
        endCursor: data?.products.pageInfo.endCursor,
    }));
