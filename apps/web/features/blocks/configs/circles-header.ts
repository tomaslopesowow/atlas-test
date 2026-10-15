import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'circles-header',
        imageURL: '/admin-assets/block-thumbnails/circles-header.jpg',
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
                required: true,
            },
            {
                // Either allow all 3 labels or none
                name: 'labels',
                type: 'text',
                minRows: 3,
                maxRows: 3,
                hasMany: true,
            },
        ],
    },
});
