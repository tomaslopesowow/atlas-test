import type { Block } from 'payload';
import { ContentBlock } from './content-block';
import { CookieTable } from './cookie-table';
import { MediaBlock } from './media-block';
import { ProductHeader } from './product-header.ecommerce';
import { ProductList } from './product-list.ecommerce';
import { RelatedProducts } from './related-products.ecommerce';
import { RichText } from './rich-text';
import { Spacer } from './spacer';
import { TestimonialsBlock } from './testimonials-block';

const commonBlocks: Block[] = [
    ContentBlock,
    CookieTable,
    MediaBlock,
    RichText,
    Spacer,
    TestimonialsBlock,
];

const ecommerceBlocks: Block[] = [ProductHeader, ProductList, RelatedProducts];

export const allBlocks = (
    process.env.NEXT_PUBLIC_ECOMMERCE === 'yes'
        ? [...commonBlocks, ...ecommerceBlocks]
        : commonBlocks
).sort(compareBlocks);

function compareBlocks(a: Block, b: Block): number {
    return (a.labels?.singular ?? a.slug) < (b.labels?.singular ?? b.slug)
        ? -1
        : 1;
}
