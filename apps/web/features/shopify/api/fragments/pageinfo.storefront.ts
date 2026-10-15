import type { ResultOf } from 'gql.tada';
import { graphql } from '../graphql.storefront';

export const PageInfo = graphql(
    `fragment pageInfo on PageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
    }`,
);

export type PageInfo = ResultOf<typeof PageInfo>;
