import type { TextField } from 'payload';

export type ShopifyProductFieldParams = TextField & {
    showSyncProduct: boolean;
};

export const createShopifyProductField = ({
    admin,
    showSyncProduct,
    ...rest
}: Partial<ShopifyProductFieldParams>) => {
    return {
        name: 'shopifyProductId',
        type: 'text',
        ...rest,
        admin: {
            ...admin,
            components: {
                Field: {
                    path: '@/features/payload/fields/sync-shopify-product-page/index.tsx',
                    clientProps: {
                        readOnly: admin?.readOnly,
                        showSyncProduct,
                    },
                },
            },
        },
    } as TextField;
};
