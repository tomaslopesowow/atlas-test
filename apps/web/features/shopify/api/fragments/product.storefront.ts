import { graphql } from '@/features/shopify/api/graphql.storefront';
import type { ResultOf } from 'gql.tada';
import { ImageFragment } from './media';
import { ProductVariantFragment } from './product-variant.storefront';

export const ProductFragment = graphql(
    `fragment product on Product {
        id
        handle
        title
        description
        descriptionHtml
        featuredImage {
            ...image
        }
        images(first: 100) {
            nodes {
                ...image
            }
        }
        seo {
            title
            description
        }
        selectedOrFirstAvailableVariant {
            ...productVariant
        }
        variants(first: 100) {
            nodes {
                ...productVariant
            }
        }
    }`,
    [ImageFragment, ProductVariantFragment],
);

export type Product = ResultOf<typeof ProductFragment>;
