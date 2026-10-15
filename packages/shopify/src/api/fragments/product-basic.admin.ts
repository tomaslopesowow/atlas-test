import type { ResultOf } from 'gql.tada';
import { graphql } from '@/api/graphql.admin';

export const ProductBasicFragment = graphql(
    `fragment productBasic on Product {
        id
        title
    }`,
);

export type ProductBasicType = ResultOf<typeof ProductBasicFragment>;
