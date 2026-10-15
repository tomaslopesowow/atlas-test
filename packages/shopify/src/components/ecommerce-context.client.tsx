'use client';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { type PropsWithChildren, use, useMemo } from 'react';
import { Provider as URQLProvider } from 'urql';
import { getShopifyStorefrontClient } from '@/api/client';
import type { getShop } from '@/api/get-shop.storefront';
import {
    SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_VERSION,
} from '@/config/shared';
import type { EcommerceSettings } from '@/types';
import { extractIdFromGid } from '@/utils/extract-id-from-gid';
import { CartDialog } from './cart-dialog';
import { CartDialogProvider } from './cart-dialog-context';
import { CartUtilsProvider } from './cart-utils-context';
import { EcommerceSettingsProvider } from './ecommerce-settings-context';

export type ShopifyProviderProps = PropsWithChildren<{
    resource: ReturnType<typeof getShop>;
    settings?: EcommerceSettings | null;
}>;

export const CommerceProviderClient = ({
    children,
    resource,
    settings = null,
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
                    <EcommerceSettingsProvider value={settings}>
                        <CartUtilsProvider>
                            <CartDialogProvider>
                                {children}
                                <CartDialog />
                            </CartDialogProvider>
                        </CartUtilsProvider>
                    </EcommerceSettingsProvider>
                </CartProvider>
            </ShopifyProvider>
        </URQLProvider>
    );
};
