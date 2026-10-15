import { getShop } from '@/features/shopify/api/get-shop.storefront';
import dynamic from 'next/dynamic';
import type { PropsWithChildren } from 'react';
import { getLocalizationContext } from '../utils/localization';

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

    const { country, language } = await getLocalizationContext();

    return (
        <LazyClientProvider resource={getShop({ country, language })}>
            {children}
        </LazyClientProvider>
    );
};

export default CommerceProvider;
