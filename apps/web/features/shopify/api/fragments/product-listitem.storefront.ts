import { graphql } from '@/features/shopify/api/graphql.storefront';
import type { ResultOf } from 'gql.tada';
import { ImageFragment } from './media';
import { ProductVariantFragment } from './product-variant.storefront';

export const ProductListItem = graphql(
    `fragment productListItem on Product {
        id
        handle
        title
        featuredImage {
            ...image
        }
        selectedOrFirstAvailableVariant {
            ...productVariant
        }
    }`,
    [ImageFragment, ProductVariantFragment],
);

export type ProductListItem = ResultOf<typeof ProductListItem>;
