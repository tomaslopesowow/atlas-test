import '@/features/blocks/importMap.js';
import { blocksRegistry } from '@/features/blocks/_internal/registry';

export const allBlocks = blocksRegistry
    .findBlocks('blocks')
    .map(({ block }) => block)
    .sort((a, b) =>
        (a.labels?.singular ?? a.slug) < (b.labels?.singular ?? b.slug)
            ? -1
            : 1,
    );
