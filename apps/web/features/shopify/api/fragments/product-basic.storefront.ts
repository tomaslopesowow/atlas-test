import { graphql } from '@/features/shopify/api/graphql.storefront';
import type { ResultOf } from 'gql.tada';

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
