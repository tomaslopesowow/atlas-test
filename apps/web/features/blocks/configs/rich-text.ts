import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'rich-text',
        imageURL: '/admin-assets/block-thumbnails/rich-text.png',
        labels: {
            singular: 'Rich Text',
            plural: 'Rich Text',
        },
        fields: [
            {
                name: 'content',
                type: 'richText',
                label: 'Content',
                localized: true,
            },
            {
                name: 'width',
                type: 'select',
                options: ['large', 'medium', 'small'],
                defaultValue: 'medium',
            },
        ],
    },
});
