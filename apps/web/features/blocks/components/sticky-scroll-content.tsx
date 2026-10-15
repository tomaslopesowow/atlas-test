import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { StickyScrollContent } from '@/payload-types';
import { StickyScrollContentClient } from './sticky-scroll-content.client';

defineBlockComponent({
    slug: 'sticky-scroll-content',
    component: ({ block }: { block: StickyScrollContent }) => (
        <StickyScrollContentClient {...block} />
    ),
});
