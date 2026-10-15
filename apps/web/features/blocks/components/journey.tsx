import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { Journey } from '@/payload-types';
import { JourneyClient } from './journey.client';

defineBlockComponent({
    slug: 'journey',
    defaultAttributes: {
        className: 'overflow-x-clip',
    },

    component: ({ block }: { block: Journey }) => {
        return <JourneyClient {...block} />;
    },
});
