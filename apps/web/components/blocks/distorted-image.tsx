import { DistortedImage } from '@/features/animation/components/distorted-image';
import { blocksRegistry } from '@/features/blocks/registry';
import { DistortedImageBlock } from '@/features/payload/blocks/distorted-image';
import type { Media } from '@/payload-types';

blocksRegistry.addBlock(DistortedImageBlock.slug, {
    component: ({ block: { image } }) => {
        if (!image) return;

        const { media } = image;
        if (!media) return;

        return <DistortedImage image={media as Media} />;
    },
});
