import '@/features/blocks/navigation';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import type { GlobalConfig } from 'payload';

/**
 * Navigation global configuration.
 * Fields are defined in @/features/blocks/navigation.tsx and extracted from the blocks registry.
 */
const navigationBlock = blocksRegistry.findBlock('global', 'navigation');

if (!navigationBlock) {
    throw new Error(
        'Navigation block not found in registry. Ensure @/features/blocks/navigation is imported.',
    );
}

export const Navigation: GlobalConfig = {
    slug: 'navigation',
    fields: navigationBlock.block.fields,
};
