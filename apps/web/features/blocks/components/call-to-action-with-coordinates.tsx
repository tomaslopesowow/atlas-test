import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { CallToActionWithCoordinatesClient } from './call-to-action-with-coordinates.client';

defineBlockComponent({
    slug: 'call-to-action-with-coordinates',
    component: ({ block }) => <CallToActionWithCoordinatesClient {...block} />,
});
