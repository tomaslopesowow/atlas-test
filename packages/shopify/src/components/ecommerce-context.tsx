import dynamic from 'next/dynamic';
import type { PropsWithChildren } from 'react';
import { getShop } from '@/api/get-shop.storefront';
import type { EcommerceSettings } from '@/types';
import { getLocalizationContext } from '@/utils/localization';

// Dynamically import the wrapper only when needed
const LazyClientProvider = dynamic(
    () =>
        import('./ecommerce-context.client').then(
            (mod) => mod.CommerceProviderClient,
        ),
    { ssr: true },
);

export const CommerceProvider = async ({
    children,
    settings = null,
}: PropsWithChildren<{ settings?: EcommerceSettings | null }>) => {
    if (process.env.NEXT_PUBLIC_ECOMMERCE !== 'yes') {
        return children;
    }

    const { country, language } = await getLocalizationContext();

    return (
        <LazyClientProvider
            resource={getShop({ country, language })}
            settings={settings}
        >
            {children}
        </LazyClientProvider>
    );
};

export default CommerceProvider;
