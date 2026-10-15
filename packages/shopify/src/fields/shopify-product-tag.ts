import type { TextField } from 'payload';
import { fieldCreator } from '@/fields/field-creator';

const FIELD = {
    name: 'shopifyProductTag',
    label: 'Product Tags',
    type: 'text',
    admin: {
        components: {
            Field: '@repo/shopify/components/payload/product-tag-select',
        },
    },
} satisfies TextField;

export const createShopifyProductTagField = fieldCreator(FIELD);
