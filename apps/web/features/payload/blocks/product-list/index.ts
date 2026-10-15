import { createShopifyCollectionField } from '../../fields/shopify-collection';
import { createShopifyProductField } from '../../fields/shopify-product';
import { createBlock } from '../../utils/create-block';
import thumbnail from './image.png';

export const ProductList = createBlock({
    slug: 'product-list',
    imageURL: thumbnail.src,
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
                description: 'Select a collection to display products from.',
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
                condition: (_, siblingData) => siblingData.type === 'products',
            },
        })),
    ],
});
