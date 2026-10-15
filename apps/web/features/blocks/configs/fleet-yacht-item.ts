import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'fleet-yacht-item',
        imageURL: '/admin-assets/block-thumbnails/fleet-yacht-item.jpg',
        fields: [
            {
                name: 'type',
                type: 'radio',
                options: ['page', 'slug'],
                defaultValue: 'page',
                admin: {
                    description:
                        'Prefer to leave this on `page`; other option exists for legacy data migration purposes.',
                },
            },
            {
                name: 'page',
                type: 'relationship',
                relationTo: 'pages',
                filterOptions: {
                    taxonomyType: {
                        equals: 'fleet',
                    },
                },
                admin: {
                    condition: (_, siblingData) => siblingData?.type === 'page',
                },
            },
            {
                name: 'slug',
                type: 'text',
                admin: {
                    condition: (_, siblingData) => siblingData?.type === 'slug',
                },
            },
        ],
    },
});
