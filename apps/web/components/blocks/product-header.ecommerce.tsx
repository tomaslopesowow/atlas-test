import { blocksRegistry } from '@/features/blocks/registry';
import { ProductHeader } from '@/features/payload/blocks/product-header.ecommerce';
import { ProductHeaderClient } from './product-header.ecommerce.client';

blocksRegistry.addBlock(ProductHeader.slug, {
    component: ({ block, page }) => {
        return <ProductHeaderClient block={block} page={page} />;
    },
});
