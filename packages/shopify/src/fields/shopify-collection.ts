import type { TextField } from 'payload';
import { fieldCreator } from '@/fields/field-creator';

const FIELD = {
    name: 'shopifyCollectionId',
    label: 'Collection',
    type: 'text',
    admin: {
        components: {
            Field: '@repo/shopify/components/payload/collection-select',
        },
    },
} satisfies TextField;

export const createShopifyCollectionField = fieldCreator(FIELD);
