import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { ProductHeaderClient } from './product-header.ecommerce.client';

defineBlockComponent({
    // biome-ignore lint/suspicious/noExplicitAny: e-commerce is disabled
    slug: 'product-header' as any,
    component: ({ block, page }) => {
        return <ProductHeaderClient block={block} page={page} />;
    },
});
