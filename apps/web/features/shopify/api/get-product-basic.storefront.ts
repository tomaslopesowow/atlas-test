import { getShopifyStorefrontClient } from '@/features/shopify/api/client';
import { ProductBasicFragment } from '@/features/shopify/api/fragments/product-basic.storefront';
import { graphql } from '@/features/shopify/api/graphql.storefront';
import { captureException } from '@sentry/nextjs';
import { type VariablesOf, readFragment } from 'gql.tada';

export type GetProductsBasicParams = VariablesOf<typeof GetProductBasicQuery>;

export const GetProductBasicQuery = graphql(
    `query ProductBasic($id: ID!, $language: LanguageCode)
    @inContext(language: $language) {
        product(id: $id) {
            ...productBasic
        }
    }`,
    [ProductBasicFragment],
);

export async function getProductBasic(params: GetProductsBasicParams) {
    const result = await getShopifyStorefrontClient()
        .query(GetProductBasicQuery, params)
        .toPromise();

    if (result.error) {
        console.error(result.error);
        captureException(result.error, {
            extra: { params, operationResult: result },
        });
    }

    return readFragment(ProductBasicFragment, result.data?.product);
}
