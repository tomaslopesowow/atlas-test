'use client';
import { ProductProvider } from '@shopify/hydrogen-react';
import { type ComponentProps, type PropsWithChildren, use } from 'react';
import type { getProductById } from '../api/get-product-by-id.storefront';

export type ShopifyProviderProps = PropsWithChildren<{
    resource: ReturnType<typeof getProductById>;
}>;

export const ProductProviderClient = ({
    children,
    resource,
}: ShopifyProviderProps) => {
    const product = use(resource);

    if (!product) {
        console.error('No product found');
        return children;
    }

    return (
        <ProductProvider
            data={product as ComponentProps<typeof ProductProvider>['data']}
        >
            {children}
        </ProductProvider>
    );
};

export default ProductProviderClient;
