import type { TextField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD = {
    name: 'shopifyCollectionId',
    label: 'Collection',
    type: 'text',
    admin: {
        components: {
            Field: '@/features/payload/components/shopify/collection-select.tsx',
        },
    },
} satisfies TextField;

export const createShopifyCollectionField = fieldCreator(FIELD);
