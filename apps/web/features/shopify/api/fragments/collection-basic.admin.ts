import type { ResultOf } from 'gql.tada';
import { graphql } from '@/features/shopify/api/graphql.admin';

export const CollectionBasicFragment = graphql(
    `fragment collectionBasic on Collection {
        id
        title
    }`,
);

export type CollectionBasicType = ResultOf<typeof CollectionBasicFragment>;
