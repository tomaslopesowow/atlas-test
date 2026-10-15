import { createImageField } from '../../fields/image';
import { createShopifyProductField as createShopifySelectField } from '../../fields/shopify-product';
import { createShopifyProductField } from '../../fields/sync-shopify-product-page/field';

const TAXONOMY_PRODUCT_FIELDS = [
    createShopifyProductField({
        unique: true,
        showSyncProduct: true,
        admin: {
            condition: (data) =>
                !!data?.taxonomyData?.product?.shopifyProductId,
            readOnly: true,
        },
    }),
    {
        name: 'details',
        type: 'array',
        fields: [
            {
                name: 'title',
                type: 'text',
                required: true,
                localized: true,
            },
            {
                name: 'content',
                type: 'richText',
                localized: true,
            },
        ],
    },
    {
        name: 'relatedProducts',
        type: 'group',
        fields: [
            {
                name: 'type',
                type: 'radio',
                options: [
                    {
                        value: 'automatic',
                        label: 'Automatic',
                    },
                    { value: 'manual', label: 'Manual' },
                ],
                defaultValue: 'automatic',
                admin: {
                    description:
                        'Automatic: let Shopify generate the related products. Manual: select products to showcase yourself.',
                },
            },
            createShopifySelectField((field) => ({
                ...field,
                hasMany: true,
                name: 'manualProducts',
                admin: {
                    ...field.admin,
                    condition: (_: unknown, siblingData: { type: string }) =>
                        siblingData.type === 'manual',
                },
            })),
        ],
    },
];

const TAXONOMY_NEWS_FIELDS = [
    {
        name: 'description',
        type: 'textarea',
        localized: true,
    },
    createImageField({
        name: 'cover',
    }),
    {
        name: 'author',
        type: 'relationship',
        relationTo: 'people',
    },
];

const TAXONOMY_CASES_FIELDS = [
    {
        name: 'description',
        type: 'textarea',
        localized: true,
    },
    createImageField({
        name: 'cover',
    }),
    {
        name: 'client',
        type: 'text',
        localized: true,
    },
];

export const taxonomyConfigs = {
    ...(process.env.NEXT_PUBLIC_ECOMMERCE === 'yes' && {
        product: TAXONOMY_PRODUCT_FIELDS,
    }),

    news: TAXONOMY_NEWS_FIELDS,
    cases: TAXONOMY_CASES_FIELDS,
};
