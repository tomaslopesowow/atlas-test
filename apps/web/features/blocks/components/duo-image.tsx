import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { DuoImage } from '@/payload-types';
import { DuoImageClient } from './duo-image.client';

defineBlockComponent({
    slug: 'duo-image',
    component: ({ block }: { block: DuoImage }) => {
        return <DuoImageClient {...block} />;
    },
});
