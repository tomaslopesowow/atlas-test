import type { VariablesOf } from 'gql.tada';
import { adminQuery } from './client';
import { graphql } from './graphql.admin';

export const GetProductTagsQuery = graphql(`
    query GetProductTags($first: Int!, $after: String) {
        productTags(first: $first, after: $after) {
            nodes
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`);

export const getProductTags = (
    variables: VariablesOf<typeof GetProductTagsQuery>,
) =>
    adminQuery({
        query: GetProductTagsQuery,
        variables,
    });
