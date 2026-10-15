import type { Block } from 'payload';
import { CookieTable } from './cookie-table';
import { MediaBlock } from './media-block';
import { ProductHeader } from './product-header';
import { ProductList } from './product-list';
import { RelatedProducts } from './related-products';
import { RichText } from './rich-text';
import { Spacer } from './spacer';

const commonBlocks: Block[] = [MediaBlock, RichText, Spacer, CookieTable];

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
