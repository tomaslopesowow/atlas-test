import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'related-articles-carousel',
        imageURL:
            '/admin-assets/block-thumbnails/related-articles-carousel.jpg',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
        ],
    },
    withSettings: false,
});
