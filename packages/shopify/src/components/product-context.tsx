import type { Maybe } from '@repo/lib/types/maybe';
import dynamic from 'next/dynamic';
import type { PropsWithChildren } from 'react';
import { getProductById } from '@/api/get-product-by-id.storefront';
import type { ProductTaxonomyPage } from '@/types';
import { getLocalizationContext } from '@/utils/localization';

// Dynamically import the wrapper only when needed
const LazyClientProvider = dynamic(() => import('./product-context.client'), {
    ssr: true,
});

export const ProductProvider = async ({
    children,
    page,
}: PropsWithChildren<{ page: ProductTaxonomyPage }>) => {
    const productId: Maybe<string> =
        page.taxonomyData?.product?.shopifyProductId;

    if (!productId) {
        return children;
    }

    const localization = await getLocalizationContext();

    return (
        <LazyClientProvider
            resource={getProductById({
                id: productId,
                ...localization,
            })}
        >
            {children}
        </LazyClientProvider>
    );
};

export default ProductProvider;
