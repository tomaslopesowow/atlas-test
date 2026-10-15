import type { VariablesOf } from 'gql.tada';
import { storefrontQuery } from './client';
import { ProductFragment } from './fragments/product.storefront';
import { graphql } from './graphql.storefront';

export const GetProductRecommendationsQuery = graphql(
    `query ProductRecommendations($id: ID!, $language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
        productRecommendations(productId: $id) {
            ...product
        }
    }`,
    [ProductFragment],
);

export const getProductRecommendations = (
    variables: VariablesOf<typeof GetProductRecommendationsQuery>,
) =>
    storefrontQuery(
        {
            query: GetProductRecommendationsQuery,
            variables,
        },
        (result) => result?.productRecommendations,
    );
