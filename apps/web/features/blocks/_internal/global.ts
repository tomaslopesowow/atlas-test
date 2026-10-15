import type { GlobalConfig } from 'payload';
import { blocksRegistry } from '@/features/blocks/_internal/registry';

/**
 * This global config only exists to register all blocks within Payload CMS, and generate types.
 * It is hidden from the admin UI and should not be edited directly.
 */
export const _Blocks: GlobalConfig = {
    slug: '_blocks',
    typescript: {
        interface: '_Blocks',
    },
    admin: {
        hidden: true,
    },
    fields: [
        {
            name: 'blocks',
            type: 'blocks',
            blocks: blocksRegistry
                .findBlocks('blocks')
                .map(({ block }) => block),
            maxRows: 0,
        },
    ],
};
