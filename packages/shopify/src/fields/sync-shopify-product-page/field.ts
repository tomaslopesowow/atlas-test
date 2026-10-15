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
                    path: '@repo/shopify/fields/sync-shopify-product-page/index',
                    clientProps: {
                        readOnly: admin?.readOnly,
                        showSyncProduct,
                    },
                },
            },
        },
    } as TextField;
};
