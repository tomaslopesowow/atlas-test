import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'fleet-yacht-header',
        imageURL: '/admin-assets/block-thumbnails/fleet-yacht-header.jpg',
        labels: {
            singular: 'Fleet Yacht Intro',
            plural: 'Fleet Yacht Intro',
        },
        fields: [],
    },
});
