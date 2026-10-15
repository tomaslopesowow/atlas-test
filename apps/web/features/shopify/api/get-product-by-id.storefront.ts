import type { VariablesOf } from 'gql.tada';
import { storefrontQuery } from './client';
import { ProductFragment } from './fragments/product.storefront';
import { graphql } from './graphql.storefront';

export const GetProductByIdQuery = graphql(
    `query ProductBasic($id: ID!, $language: LanguageCode)
        @inContext(language: $language) {
        product(id: $id) {
            ...product
        }
    }`,
    [ProductFragment],
);

export const getProductById = (
    variables: VariablesOf<typeof GetProductByIdQuery>,
) =>
    storefrontQuery(
        {
            query: GetProductByIdQuery,
            variables,
        },
        (result) => result?.product,
    );
