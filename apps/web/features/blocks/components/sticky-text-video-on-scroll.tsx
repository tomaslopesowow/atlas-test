import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { StickyTextVideoOnScroll } from '@/payload-types';
import { StickyTextVideoOnScrollClient } from './sticky-text-video-on-scroll.client';

defineBlockComponent({
    slug: 'sticky-text-video-on-scroll',
    component: ({ block }: { block: StickyTextVideoOnScroll }) => (
        <StickyTextVideoOnScrollClient {...block} />
    ),
});
