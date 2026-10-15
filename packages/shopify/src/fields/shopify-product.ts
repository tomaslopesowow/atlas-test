import type { TextField } from 'payload';
import { fieldCreator } from '@/fields/field-creator';

const FIELD = {
    name: 'shopifyProductId',
    label: 'Product',
    type: 'text',
    admin: {
        components: {
            Field: '@repo/shopify/components/payload/product-select',
        },
    },
} satisfies TextField;

export const createShopifyProductField = fieldCreator(FIELD);
