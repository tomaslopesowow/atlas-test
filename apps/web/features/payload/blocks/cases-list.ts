import { createBlock } from '../utils/create-block';

export const CasesList = createBlock({
    slug: 'cases-list',
    labels: {
        singular: 'Cases List',
        plural: 'Cases Lists',
    },
    imageURL: '/admin-assets/block-thumbnails/case-list.png',
    fields: [
        {
            name: 'sectionTitle',
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
            type: 'textarea',
            localized: true,
        },
        {
            name: 'CustomPages',
            type: 'checkbox',
            defaultValue: false,
        },
        {
            name: 'customPages',
            type: 'relationship',
            relationTo: 'pages',
            filterOptions: {
                taxonomyType: { equals: 'cases' },
            },
            hasMany: true,
            admin: {
                isSortable: true,
                condition: (data, siblingData) => siblingData.CustomPages,
            },
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
                    name: 'Title',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                        style: {
                            display: 'inline-block',
                        },
                    },
                },
                {
                    name: 'Description',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                        style: {
                            display: 'inline-block',
                            marginLeft: '3em',
                        },
                    },
                },
                {
                    name: 'Date',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                        style: {
                            display: 'inline-block',
                            marginLeft: '3em',
                        },
                    },
                },
                {
                    name: 'Tags',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                        style: {
                            display: 'inline-block',
                            marginLeft: '3em',
                        },
                    },
                },
                {
                    name: 'itemsPerPage',
                    type: 'number',
                    defaultValue: 12,
                },
                {
                    name: 'sortBy',
                    type: 'select',
                    options: [
                        'newest first',
                        'oldest first',
                        'alphabetical',
                        'alphabetical reverse',
                    ],
                    defaultValue: 'newest first',
                },
                {
                    name: 'gridColumns',
                    type: 'select',
                    options: ['2', '3'],
                    defaultValue: '3',
                },
                {
                    name: 'pagination',
                    type: 'select',
                    options: ['pagination', 'none'],
                    defaultValue: 'pagination',
                },
            ],
        },
    ],
});
