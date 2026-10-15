import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createShopifyCollectionField } from '@/features/payload/fields/shopify-collection';
import { createShopifyProductField } from '@/features/payload/fields/shopify-product';

defineBlockConfig({
    block: {
        slug: 'product-list',
        imageURL: '/admin-assets/block-thumbnails/product-list.png',
        fields: [
            {
                name: 'type',
                label: 'List Type',
                type: 'radio',
                options: [
                    { value: 'collection', label: 'Collection' },
                    { value: 'products', label: 'Specific products' },
                ],
                defaultValue: 'collection',
                admin: {
                    description:
                        'Select a collection or choose specific products to display.',
                },
            },

            createShopifyCollectionField((field) => ({
                ...field,
                name: 'shopifyCollectionId',
                admin: {
                    ...field.admin,
                    description:
                        'Select a collection to display products from.',
                    condition: (_, siblingData) =>
                        siblingData.type === 'collection',
                },
            })),

            createShopifyProductField((field) => ({
                ...field,
                name: 'shopifyProductIds',
                hasMany: true,
                maxRows: 100,
                admin: {
                    ...field.admin,
                    description: 'Select specific products.',
                    condition: (_, siblingData) =>
                        siblingData.type === 'products',
                },
            })),
        ],
    },
});
