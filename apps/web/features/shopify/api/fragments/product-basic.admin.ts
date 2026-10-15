import { graphql } from '@/features/shopify/api/graphql.admin';
import type { ResultOf } from 'gql.tada';

export const ProductBasicFragment = graphql(
    `fragment productBasic on Product {
        id
        title
    }`,
);

export type ProductBasicType = ResultOf<typeof ProductBasicFragment>;
