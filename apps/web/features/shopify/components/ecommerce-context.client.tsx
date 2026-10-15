'use client';

import { extractIdFromGid } from '@repo/lib-shopify/extract-id-from-gid';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { type PropsWithChildren, use, useMemo } from 'react';
import { Provider as URQLProvider } from 'urql';
import {
    SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_VERSION,
} from '@/features/shopify/config/shared';
import { getShopifyStorefrontClient } from '../api/client';
import type { getShop } from '../api/get-shop.storefront';
import { CartDialog } from './cart-dialog';
import { CartDialogProvider } from './cart-dialog-context';
import { CartUtilsProvider } from './cart-utils-context';

export type ShopifyProviderProps = PropsWithChildren<{
    resource: ReturnType<typeof getShop>;
}>;

export const CommerceProviderClient = ({
    children,
    resource,
}: ShopifyProviderProps) => {
    const storefrontClient = useMemo(() => getShopifyStorefrontClient(), []);
    const { localization, shop } = use(resource);

    if (!localization) {
        throw new Error('No localization found');
    }

    if (!shop) {
        throw new Error('No shop found');
    }

    return (
        <URQLProvider value={storefrontClient}>
            <ShopifyProvider
                countryIsoCode={localization.country.isoCode}
                languageIsoCode={localization.language.isoCode}
                storeDomain={SHOPIFY_STORE_DOMAIN}
                storefrontApiVersion={SHOPIFY_STOREFRONT_API_VERSION}
                storefrontId={extractIdFromGid(shop.id)}
                storefrontToken={
                    process.env
                        .NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_PUBLIC_ACCESS_TOKEN ??
                    'MISSING_SHOPIFY_STOREFRONT_ACCESS_TOKEN'
                }
            >
                <CartProvider
                    countryCode={localization.country.isoCode}
                    languageCode={localization.language.isoCode}
                >
                    <CartUtilsProvider>
                        <CartDialogProvider>
                            {children}
                            <CartDialog />
                        </CartDialogProvider>
                    </CartUtilsProvider>
                </CartProvider>
            </ShopifyProvider>
        </URQLProvider>
    );
};
