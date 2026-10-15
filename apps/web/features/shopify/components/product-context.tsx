import dynamic from 'next/dynamic';
import type { PropsWithChildren } from 'react';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import type { Page } from '@/payload-types';
import type { Maybe } from '@/utils/maybe';
import { getProductById } from '../api/get-product-by-id.storefront';
import { getLocalizationContext } from '../utils/localization';

// Dynamically import the wrapper only when needed
const LazyClientProvider = dynamic(() => import('./product-context.client'), {
    ssr: true,
});

export const ProductProvider = async ({
    children,
    page,
}: PropsWithChildren<{ page: Page }>) => {
    const productId: Maybe<string> = (page as PageWithGenericTaxonomies)
        .taxonomyData?.product?.shopifyProductId;

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
