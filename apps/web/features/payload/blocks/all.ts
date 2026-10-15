import '@/features/blocks/importMap.configs.js';
import type { Block } from 'payload';
import { findBlockConfigs } from '@/features/blocks/_internal/registry';

export const allBlocks = findBlockConfigs('blocks')
    .map(({ block }) => block as Block)
    .sort((a, b) =>
        (a.labels?.singular ?? a.slug) < (b.labels?.singular ?? b.slug)
            ? -1
            : 1,
    );
