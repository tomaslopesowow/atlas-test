import { blocksRegistry } from '@/features/blocks/registry';
import { Spacer } from '@/features/payload/blocks/spacer';
import clsx from 'clsx';

export const SPACER_CLASSNAMES = {
    0: 'h-2',
    1: 'h-4',
    2: 'h-8',
    3: 'h-16',
    4: 'h-32',
    5: 'h-48',
    6: 'h-64',
    7: 'h-80',
    8: 'h-96',
};

blocksRegistry.addBlock(Spacer.slug, {
    component: ({ block }) => (
        <div
            className={clsx(SPACER_CLASSNAMES[block.size ?? '0'])}
            aria-hidden
        />
    ),
});
