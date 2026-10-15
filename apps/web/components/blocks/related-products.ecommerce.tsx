import { blocksRegistry } from '@/features/blocks/registry';
import { RelatedProducts } from '@/features/payload/blocks/related-products.ecommerce';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import type { Product } from '@/features/shopify/api/fragments/product.storefront';
import { getProductById } from '@/features/shopify/api/get-product-by-id.storefront';
import { getProductRecommendations } from '@/features/shopify/api/get-product-recommendations';
import { getLocalizationContext } from '@/features/shopify/utils/localization';
import { RelatedProductsClient } from './related-products.ecommerce.client';

blocksRegistry.addBlock(RelatedProducts.slug, {
    className: 'overflow-x-hidden',
    component: async ({ block: { title }, page }) => {
        const product = (page as PageWithGenericTaxonomies)?.taxonomyData
            ?.product;
        const [id, relatedProductsData] = [
            product?.shopifyProductId,
            product?.relatedProducts,
        ];

        if (!id || !relatedProductsData) return;

        const relatedProducts: Product[] = [];
        const { type, manualProducts } = relatedProductsData;
        const { language } = await getLocalizationContext();

        switch (type) {
            case 'manual': {
                if (!manualProducts?.length) return;
                const products = await Promise.all(
                    (manualProducts as string[]).map((id) =>
                        getProductById({ id }),
                    ),
                );
                relatedProducts.push(...(products as unknown as Product[]));
                break;
            }
            case 'automatic': {
                const recommendations = await getProductRecommendations({
                    id,
                    language,
                });
                if (!recommendations?.length) return;
                relatedProducts.push(
                    ...(recommendations as unknown as Product[]),
                );
                break;
            }
        }

        return <RelatedProductsClient {...{ title, relatedProducts }} />;
    },
});
