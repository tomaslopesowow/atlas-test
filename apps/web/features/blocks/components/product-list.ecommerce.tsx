import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { ProductFilterProvider } from '@/features/shopify/components/product-filter-context';
import { ProductListClient } from './product-list.ecommerce.client';
import { getProductList } from '../configs/product-list.ecommerce.shared';

defineBlockComponent({
    // biome-ignore lint/suspicious/noExplicitAny: e-commerce is disabled
    slug: 'product-list' as any,
    component: async ({
        block: { type, shopifyProductIds, shopifyCollectionId },
        pageProps,
    }) => {
        if (!type) return null;

        const searchParams = await pageProps.searchParams;
        const sort = searchParams.sort as string | undefined;

        const filter = Object.entries(searchParams || {})
            .filter(([key]) => key.startsWith('filter.'))
            .reduce(
                (acc, [key, value]) => {
                    const filterName = key.replace('filter.', '');
                    acc[filterName] = value as string;
                    return acc;
                },
                {} as Record<string, string>,
            );

        return (
            <ProductFilterProvider initialState={{ filter, sort }}>
                <div>
                    <ProductListClient
                        initialConfig={getProductList({
                            type,
                            shopifyCollectionId,
                            shopifyProductIds,
                            filter,
                            sort,
                        })}
                    />
                </div>
            </ProductFilterProvider>
        );
    },
});
