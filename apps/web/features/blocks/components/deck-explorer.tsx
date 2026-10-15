import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { DeckExplorerClient } from './deck-explorer.client';

defineBlockComponent({
    slug: 'deck-explorer',
    component: ({ block }) => <DeckExplorerClient {...block} />,
});
