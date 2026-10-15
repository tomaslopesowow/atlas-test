import { productHeaderBlock } from './blocks/product-header';
import { productListBlock } from './blocks/product-list';
import { relatedProductsBlock } from './blocks/related-products';

export type { ShopifyBlockConfig } from './blocks/types';

export const shopifyBlocks = [
    productListBlock,
    productHeaderBlock,
    relatedProductsBlock,
];
