import type { VariablesOf } from 'gql.tada';
import { storefrontQuery } from './client';
import { CollectionBasicFragment } from './fragments/collection-basic.admin';
import { graphql } from './graphql.admin';

export const GetCollectionsBasicQuery = graphql(
    `query CollectionsBasic($first: Int!, $after: String) {
        collections(first: $first, after: $after) {
            nodes { ...collectionBasic }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }`,
    [CollectionBasicFragment],
);

export type GetCollectionsBasicParams = VariablesOf<
    typeof GetCollectionsBasicQuery
>;

export const getCollectionsBasic = (variables: GetCollectionsBasicParams) =>
    storefrontQuery({ query: GetCollectionsBasicQuery, variables }, (data) => ({
        collections: data?.collections.nodes ?? [],
        hasNextPage: data?.collections.pageInfo.hasNextPage ?? false,
        endCursor: data?.collections.pageInfo.endCursor,
    }));
