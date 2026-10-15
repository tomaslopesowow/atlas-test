import type { ResultOf } from 'gql.tada';
import { graphql } from '@/api/graphql.storefront';
import { ImageFragment } from './media';
import { MoneyFragment } from './money';

export const ProductVariantFragment = graphql(
    `fragment productVariant on ProductVariant {
        id
        title
        availableForSale
        currentlyNotInStock
        sku
        barcode
        quantityAvailable
        price {
            ...money
        }
        compareAtPrice {
            ...money
        }
        image {
            ...image
        }
        selectedOptions {
            name
            value
        }
        product {
            id
            handle
        }
        unitPrice {
            ...money
        }
        unitPriceMeasurement {
            measuredType
            quantityUnit
            quantityValue
            referenceUnit
            referenceValue
        }
    }`,
    [MoneyFragment, ImageFragment],
);

export type ProductVariant = ResultOf<typeof ProductVariantFragment>;
