import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { SeriesMarqueeClient } from './series-marquee.client';

defineBlockComponent({
    slug: 'series-marquee',
    component: ({ block }) => <SeriesMarqueeClient {...block} />,
});
