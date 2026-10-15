'use client';

import { Button } from '@/features/shadcn/ui/button';
import { PageInfo } from '@/features/shopify/api/fragments/pageinfo.storefront';
import { ProductListItem } from '@/features/shopify/api/fragments/product-listitem.storefront';
import { ShopifyProductCard } from '@/features/shopify/components/product-card';
import { ProductFilterDialog } from '@/features/shopify/components/product-filter-dialog';
import { ProductFilters } from '@/features/shopify/components/product-filters';
import { ProductSort } from '@/features/shopify/components/product-sort';
import type { ResultOf, VariablesOf } from 'gql.tada';
import { readFragment } from 'gql.tada';
import { useTranslations } from 'next-intl';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { useQuery } from 'urql';
import type {
    GetProductsByCollectionIdQuery,
    GetProductsListQuery,
    getProductList,
} from './product-list.ecommerce';

export type ProductListClientProps = {
    initialConfig: ReturnType<typeof getProductList>;
};

const getProductsFromConfig = (
    config: Awaited<ReturnType<typeof getProductList>>,
) => {
    if (config.result && 'collection' in config.result) {
        return config.result?.collection?.products.nodes ?? [];
    }
    return config.result?.products.nodes ?? [];
};

export const ProductListClient = ({
    initialConfig,
}: ProductListClientProps) => {
    const t = useTranslations('ecommerce');
    const config = use(initialConfig);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

    const initialPageInfo = useMemo(() => {
        if (config.result && 'collection' in config.result) {
            return readFragment(
                PageInfo,
                config.result.collection?.products.pageInfo,
            );
        }
        return readFragment(PageInfo, config.result?.products.pageInfo);
    }, [config]);

    const [products, setProducts] = useState(getProductsFromConfig(config));

    const [variables, setVariables] = useState(config.variables);
    const [pause, setPause] = useState(true);

    // Query for additional pages
    const [{ data, fetching }] = useQuery<
        | ResultOf<typeof GetProductsListQuery>
        | ResultOf<typeof GetProductsByCollectionIdQuery>
    >({
        query: config.query,
        variables:
            'id' in variables && !!variables.id
                ? (variables as VariablesOf<
                      typeof GetProductsByCollectionIdQuery
                  >)
                : (variables as VariablesOf<typeof GetProductsListQuery>),
        pause,
    });

    const pageInfo = useMemo(() => {
        if (!data) return initialPageInfo;

        if ('collection' in data) {
            return readFragment(PageInfo, data.collection?.products.pageInfo);
        }

        return readFragment(PageInfo, data?.products.pageInfo);
    }, [data, initialPageInfo]);

    const handleLoadMore = useCallback(() => {
        setPause(false);

        if (fetching) return;

        let pageInfo = initialPageInfo;

        if (data && 'collection' in data) {
            pageInfo = readFragment(
                PageInfo,
                data.collection?.products.pageInfo,
            );
        }

        if (data && 'products' in data) {
            pageInfo = readFragment(PageInfo, data.products.pageInfo);
        }

        setVariables((currentVariables) => ({
            ...currentVariables,
            after: pageInfo?.endCursor,
        }));
    }, [data, fetching, initialPageInfo]);

    useEffect(() => {
        if (!data || fetching) return;

        setProducts((currentProducts) => {
            let nextProducts: typeof currentProducts = [];

            if ('collection' in data) {
                nextProducts = [
                    ...currentProducts,
                    ...(data.collection?.products.nodes ?? []),
                ];
            }

            if ('products' in data) {
                nextProducts = [
                    ...currentProducts,
                    ...(data.products.nodes ?? []),
                ];
            }

            // Ensure products have unique IDs by using a Map with product ID as key
            const uniqueProductsMap = new Map();

            // Add all products to the map, which will automatically handle duplicates
            for (const node of nextProducts) {
                const product = readFragment(ProductListItem, node);
                uniqueProductsMap.set(product.id, node);
            }

            // Convert the Map values back to an array
            return Array.from(uniqueProductsMap.values());
        });
    }, [data, fetching]);

    useUpdateEffect(() => {
        setVariables(config.variables);
        setProducts(getProductsFromConfig(config));
    }, [config]);

    return (
        <>
            <div className="flex flex-col gap-8">
                <div className="flex justify-center items-center gap-2 sm:justify-end">
                    <Button onClick={() => setIsFilterDialogOpen(true)}>
                        {t('product-filters.filters')}
                    </Button>

                    <ProductSort
                        defaultSort={
                            config.params.type === 'collection'
                                ? 'manual'
                                : 'best-selling'
                        }
                    />
                </div>

                <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((node) => {
                        const product = readFragment(ProductListItem, node);
                        return (
                            <ShopifyProductCard
                                key={product.id}
                                product={product}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-center items-center">
                    {pageInfo?.hasNextPage && (
                        <Button onClick={handleLoadMore} disabled={fetching}>
                            {fetching
                                ? t('product-list.loading')
                                : t('product-list.load-more')}
                        </Button>
                    )}
                </div>
            </div>

            <ProductFilterDialog
                open={isFilterDialogOpen}
                onOpenChange={setIsFilterDialogOpen}
            >
                <ProductFilters
                    filters={[
                        {
                            name: 'available',
                            label: t('product-filters.in-stock'),
                            type: 'checkbox',
                        },
                        {
                            name: 'unavailable',
                            label: t('product-filters.out-of-stock'),
                            type: 'checkbox',
                        },
                    ]}
                />
            </ProductFilterDialog>
        </>
    );
};
