import type { ResultOf } from 'gql.tada';
import { graphql } from '@/api/graphql.storefront';
import { ImageFragment } from './media';

export const CollectionListItem = graphql(
    `fragment collectionListItem on Collection {
        id
        handle
        title
        description
        image {
            ...image
        }
    }`,
    [ImageFragment],
);

export type CollectionListItemType = ResultOf<typeof CollectionListItem>;
