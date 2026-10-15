import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'related-yachts-carousel',
        imageURL: '/admin-assets/block-thumbnails/yacht-carousel.png',
        labels: {
            singular: 'Related Yachts Carousel',
            plural: 'Related Yachts Carousels',
        },
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
        ],
    },
});
