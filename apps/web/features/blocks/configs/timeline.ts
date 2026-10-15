import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createImageField } from '../../payload/fields/image';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        custom: {
            webgl: true,
        },
        slug: 'timeline',
        imageURL: '/admin-assets/block-thumbnails/timeline.png',
        fields: [
            {
                name: 'periods',
                type: 'array',
                fields: [
                    {
                        name: 'startYear',
                        type: 'number',
                        required: true,
                    },
                    {
                        name: 'items',
                        type: 'array',
                        fields: [
                            {
                                name: 'year',
                                type: 'number',
                                required: true,
                            },
                            {
                                name: 'type',
                                type: 'radio',
                                options: [
                                    { label: 'Content', value: 'content' },
                                    { label: 'Yacht', value: 'yacht' },
                                    { label: 'Duo Image', value: 'duo-image' },
                                ],
                            },
                            {
                                name: 'title',
                                type: 'text',
                                localized: true,
                                admin: {
                                    condition: (_, siblingData) =>
                                        siblingData.type === 'content',
                                },
                            },
                            createSimpleRichTextField({
                                name: 'description',
                                admin: {
                                    condition: (_, siblingData) =>
                                        siblingData.type === 'content',
                                },
                            }),
                            createImageField({
                                admin: {
                                    condition: (_, siblingData) =>
                                        siblingData.type === 'content',
                                },
                            }),
                            createImageField({
                                name: 'image1',
                                admin: {
                                    condition: (_, siblingData) =>
                                        siblingData.type === 'duo-image',
                                },
                            }),
                            createImageField({
                                name: 'image2',
                                admin: {
                                    condition: (_, siblingData) =>
                                        siblingData.type === 'duo-image',
                                },
                            }),
                            {
                                name: 'yacht',
                                type: 'relationship',
                                relationTo: 'pages',
                                filterOptions: {
                                    taxonomyType: {
                                        in: ['fleet', 'resale'],
                                    },
                                },
                                admin: {
                                    condition: (_, siblingData) =>
                                        siblingData.type === 'yacht',
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
});
