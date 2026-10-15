import { blocksRegistry } from '@/features/blocks/registry';

blocksRegistry.addFooter({
    component: ({ block }) => <pre>{JSON.stringify(block, null, 2)}</pre>,
});
