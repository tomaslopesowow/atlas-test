import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { TimelineClient } from './timeline.client';

defineBlockComponent({
    slug: 'timeline',
    component: ({ block }) => {
        return <TimelineClient {...block} />;
    },
});
