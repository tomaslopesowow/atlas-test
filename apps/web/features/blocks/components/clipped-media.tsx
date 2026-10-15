import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { ClippedMedia as ClippedMediaType } from '@/payload-types';
import { ClippedMedia as ClippedMediaComponent } from '../../animation/components/clipped-media';

defineBlockComponent({
    slug: 'clipped-media',
    component: ({ block }: { block: ClippedMediaType }) => {
        if (!block.media) return null;
        return <ClippedMediaComponent media={block.media} />;
    },
});
