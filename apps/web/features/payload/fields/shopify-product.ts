import type { TextField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD = {
    name: 'shopifyProductId',
    label: 'Product',
    type: 'text',
    admin: {
        components: {
            Field: '@/features/payload/components/shopify/product-select.tsx',
        },
    },
} satisfies TextField;

export const createShopifyProductField = fieldCreator(FIELD);
