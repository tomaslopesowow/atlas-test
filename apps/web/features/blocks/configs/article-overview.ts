import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import type { taxonomyConfigs } from '../../payload/features/taxonomies/taxonomies';
import type { ArticleOverview } from '@/payload-types';
import type { Where } from 'payload';
import { createLinkField } from '../../payload/fields/link';

const TAXONOMY_TYPE_OPTIONS: (keyof typeof taxonomyConfigs)[] = [
    'news',
    'press',
] as const;

defineBlockConfig({
    block: {
        slug: 'article-overview',
        imageURL: '/admin-assets/block-thumbnails/article-overview.png',
        fields: [
            {
                name: 'taxonomyType',
                type: 'select',
                options: TAXONOMY_TYPE_OPTIONS,
                required: true,
                defaultValue: TAXONOMY_TYPE_OPTIONS[0],
            },
            {
                name: 'featuredArticle',
                type: 'relationship',
                relationTo: 'pages',
                filterOptions: ({ siblingData }): Where => ({
                    and: [
                        {
                            taxonomyType: {
                                equals: (
                                    siblingData as {
                                        taxonomyType?: ArticleOverview['taxonomyType'];
                                    }
                                ).taxonomyType,
                            },
                        },
                        {
                            _status: {
                                equals: 'published',
                            },
                        },
                    ],
                }),
            },
            {
                admin: {
                    description:
                        'Settings for an optional call to action which is rendered within the articles grid, on the 3th grid column.',
                },
                name: 'callToAction',
                type: 'group',
                fields: [
                    {
                        name: 'enabled',
                        type: 'checkbox',
                        defaultValue: false,
                    },
                    {
                        name: 'eyebrow',
                        type: 'text',
                        localized: true,
                        admin: {
                            condition: (_, { enabled }) => enabled,
                        },
                    },
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                        admin: {
                            condition: (_, { enabled }) => enabled,
                        },
                    },
                    {
                        name: 'subtitle',
                        type: 'text',
                        localized: true,
                        admin: {
                            condition: (_, { enabled }) => enabled,
                        },
                    },
                    createLinkField((field) => ({
                        ...field,
                        admin: {
                            ...field.admin,
                            condition: (_, { enabled }) => enabled,
                        },
                    })),
                ],
            },
        ],
    },
});
