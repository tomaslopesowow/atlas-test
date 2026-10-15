import { blocksRegistry } from '@/features/blocks/registry';
import { CookieTable } from '@/features/payload/blocks/cookie-table';
import { CookieTableClient } from './cookie-table.client';

blocksRegistry.addBlock(CookieTable.slug, {
    component: ({ block }) => <CookieTableClient block={block} />,
});
