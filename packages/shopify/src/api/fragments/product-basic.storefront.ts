import type { ResultOf } from 'gql.tada';
import { graphql } from '@/api/graphql.storefront';

export const ProductBasicFragment = graphql(
    `fragment productBasic on Product {
        id
        title
        handle
        description
        featuredImage {
            url
            altText
        }
        seo {
            title
            description
        }
    }`,
);

export type ProductBasicType = ResultOf<typeof ProductBasicFragment>;
