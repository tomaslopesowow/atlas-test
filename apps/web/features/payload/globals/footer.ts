import '@/features/blocks/footer';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import type { GlobalConfig } from 'payload';

/**
 * Footer global configuration.
 * Fields are defined in @/features/blocks/footer.tsx and extracted from the blocks registry.
 */
const footerBlock = blocksRegistry.findBlock('global', 'footer');

if (!footerBlock) {
    throw new Error(
        'Footer block not found in registry. Ensure @/features/blocks/footer is imported.',
    );
}

export const Footer: GlobalConfig = {
    slug: 'footer',
    label: 'Footer',
    fields: footerBlock.block.fields,
};
