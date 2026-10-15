import { blocksRegistry } from '@/features/blocks/registry';

blocksRegistry.addNavigation({
    component: ({ block }) => (
        <div>
            <pre>{JSON.stringify(block, null, 2)}</pre>
        </div>
    ),
});
