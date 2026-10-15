import { getShop } from '@/features/shopify/api/get-shop.storefront';
import { SHOPIFY_DEFAULT_COUNTRY } from '@/features/shopify/config/shared';
import type { LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import { getLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';
import type { PropsWithChildren } from 'react';

// Dynamically import the wrapper only when needed
const LazyClientProvider = dynamic(
    () =>
        import('./ecommerce-context.client').then(
            (mod) => mod.CommerceProviderClient,
        ),
    { ssr: true },
);

export const CommerceProvider = async ({ children }: PropsWithChildren) => {
    if (process.env.NEXT_PUBLIC_ECOMMERCE !== 'yes') {
        return children;
    }

    return (
        <LazyClientProvider
            resource={getShop({
                country: SHOPIFY_DEFAULT_COUNTRY,
                language: (await getLocale()).toUpperCase() as LanguageCode,
            })}
        >
            {children}
        </LazyClientProvider>
    );
};

export default CommerceProvider;
