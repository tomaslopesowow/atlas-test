import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { createVideoOnScrollField } from '../../payload/fields/video-on-scroll';

defineBlockConfig({
    block: {
        slug: 'sticky-text-video-on-scroll',
        imageURL:
            '/admin-assets/block-thumbnails/sticky-text-video-on-scroll.png',
        fields: [
            {
                name: 'content1',
                type: 'group',
                fields: [
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                        required: true,
                    },
                    createSimpleRichTextField(),
                ],
            },
            {
                name: 'content2',
                type: 'group',
                fields: [
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                        required: true,
                    },
                    createSimpleRichTextField(),
                ],
            },
            createVideoOnScrollField({ required: true }),
        ],
    },
});
