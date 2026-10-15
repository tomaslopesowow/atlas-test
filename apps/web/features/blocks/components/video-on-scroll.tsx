import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { VideoOnScroll as VideoOnScrollType } from '@/payload-types';
import { VideoOnScroll } from '../../animation/components/video-on-scroll';

defineBlockComponent({
    slug: 'video-on-scroll',
    component: ({ block }: { block: VideoOnScrollType }) => (
        <VideoOnScroll {...block.videoOnScroll} />
    ),
});
