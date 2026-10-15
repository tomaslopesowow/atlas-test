import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { createVideoField } from '../../payload/fields/video';

defineBlockConfig({
    block: {
        slug: 'chapter-videos',
        imageURL: '/admin-assets/block-thumbnails/chapter-videos.png',
        fields: [
            {
                name: 'chapters',
                type: 'array',
                fields: [
                    createVideoField(),
                    createSimpleRichTextField({ name: 'title' }),
                ],
            },
        ],
    },
});
