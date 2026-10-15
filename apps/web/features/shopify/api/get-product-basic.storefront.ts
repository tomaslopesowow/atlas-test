import { getShopifyStorefrontClient } from '@/features/shopify/api/client';
import { ProductBasicFragment } from '@/features/shopify/api/fragments/product-basic.storefront';
import { graphql } from '@/features/shopify/api/graphql.storefront';
import { type VariablesOf, readFragment } from 'gql.tada';

export type GetProductsBasicParams = VariablesOf<typeof GetProductBasicQuery>;

export const GetProductBasicQuery = graphql(
    `query ProductBasic($id: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
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
        // Log error - OpenTelemetry will automatically capture this
        console.error('Failed to get product basic:', result.error, {
            params,
            operationResult: result,
        });
    }

    return readFragment(ProductBasicFragment, result.data?.product);
}
