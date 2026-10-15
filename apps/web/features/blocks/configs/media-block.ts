import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createMediaField } from '@/features/payload/fields/media';

defineBlockConfig({
    block: {
        slug: 'media-block',
        imageURL: '/admin-assets/block-thumbnails/media-block.jpg',
        labels: {
            singular: 'Media Block',
            plural: 'Media Block',
        },
        fields: [
            createMediaField(),
            {
                name: 'width',
                type: 'select',
                options: ['full', 'wide', 'medium', 'narrow'],
                defaultValue: 'full',
            },
            {
                name: 'position',
                type: 'select',
                options: ['left', 'right', 'center'],
                defaultValue: 'center',
            },
        ],
    },
});
