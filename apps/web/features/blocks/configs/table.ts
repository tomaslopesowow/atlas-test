import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'table',
        imageURL: '/admin-assets/block-thumbnails/table.jpg',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'description',
                type: 'richText',
                localized: true,
            },
            {
                name: 'tableData',
                type: 'array',
                labels: {
                    singular: 'Row',
                    plural: 'Rows',
                },
                fields: [
                    {
                        name: 'header',
                        type: 'text',
                        localized: true,
                    },
                    {
                        name: 'value',
                        type: 'text',
                        localized: true,
                    },
                ],
            },
        ],
    },
});
