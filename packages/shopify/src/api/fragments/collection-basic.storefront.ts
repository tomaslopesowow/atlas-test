import type { ResultOf } from 'gql.tada';
import { graphql } from '@/api/graphql.storefront';

export const CollectionBasicFragment = graphql(
    `fragment collectionBasic on Collection {
        id
        title
    }`,
);

export type CollectionBasicType = ResultOf<typeof CollectionBasicFragment>;
