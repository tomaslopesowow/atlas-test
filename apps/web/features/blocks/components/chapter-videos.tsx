import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { ChapterVideosClient } from './chapter-videos.client';

defineBlockComponent({
    slug: 'chapter-videos',
    component: ({ block }) => {
        if (!block.chapters) return null;
        return <ChapterVideosClient {...block} />;
    },
});
