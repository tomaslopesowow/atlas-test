import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'resale-list',
        imageURL: '/admin-assets/block-thumbnails/resale-list.jpg',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'text',
                type: 'textarea',
                localized: true,
            },
            {
                type: 'collapsible',
                label: 'List Options',
                admin: {
                    description:
                        'These settings allow you to customize the visible items in the list.',
                },
                fields: [
                    {
                        name: 'itemsPerPage',
                        type: 'select',
                        options: Array.from({ length: 4 }).map((_, index) =>
                            String(12 + index * 6),
                        ),
                        defaultValue: '12',
                    },
                    {
                        name: 'sortBy',
                        type: 'select',
                        options: ['createdAt', '-createdAt', 'title', '-title'],
                        defaultValue: '-createdAt',
                    },
                    {
                        name: 'pagination',
                        type: 'checkbox',
                        defaultValue: true,
                    },
                ],
            },
        ],
    },
});
