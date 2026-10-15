import type { TextField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD = {
    name: 'shopifyProductTag',
    label: 'Product Tags',
    type: 'text',
    admin: {
        components: {
            Field: '@/features/payload/components/shopify/product-tag-select.tsx',
        },
    },
} satisfies TextField;

export const createShopifyProductTagField = fieldCreator(FIELD);
