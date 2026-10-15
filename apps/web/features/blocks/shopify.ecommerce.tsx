import { shopifyBlocks } from '@repo/shopify/blocks';
import { blocksRegistry } from './_internal/registry';

type AddBlockConfig = Parameters<typeof blocksRegistry.addBlock>[0];

for (const block of shopifyBlocks) {
    blocksRegistry.addBlock(block as AddBlockConfig);
}
