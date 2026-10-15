import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createLinkField } from '@/features/payload/fields/link';
import { createMediaField } from '@/features/payload/fields/media';

defineBlockConfig({
    block: {
        slug: 'content',
        imageURL: '/admin-assets/block-thumbnails/content.png',
        labels: {
            singular: 'Content Block',
            plural: 'Content Blocks',
        },
        fields: [
            {
                name: 'eyebrow',
                type: 'text',
                localized: true,
            },
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'text',
                type: 'richText',
                localized: true,
            },
            {
                name: 'buttons',
                type: 'array',
                maxRows: 2,
                fields: [
                    createLinkField(),
                    {
                        name: 'variant',
                        type: 'select',
                        options: ['primary', 'secondary', 'link'],
                        defaultValue: 'secondary',
                    },
                ],
            },
            {
                name: 'mediaPosition',
                type: 'select',
                options: ['left', 'right'],
                defaultValue: 'left',
            },
            {
                name: 'textAlignment',
                type: 'select',
                options: ['top', 'center', 'bottom'],
                defaultValue: 'center',
            },
            createMediaField(),
        ],
    },
});
