import { graphql } from '@/features/shopify/api/graphql.admin';
import type { ResultOf } from 'gql.tada';

export const CollectionBasicFragment = graphql(
    `fragment collectionBasic on Collection {
        id
        title
    }`,
);

export type CollectionBasicType = ResultOf<typeof CollectionBasicFragment>;
