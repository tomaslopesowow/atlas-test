import { defineNavigationConfig } from '@/features/blocks/_internal/registry';
import type { GlobalConfig } from 'payload';
import { createLinkField } from '@/features/payload/fields/link';
import { createImageField } from '../../payload/fields/image';
import { taxonomyConfigs } from '../../payload/features/taxonomies/taxonomies';

const DEFAULT_SEARCH_TAXONOMY_TYPES: (keyof typeof taxonomyConfigs)[] = [
    'news',
    'cases',
    'fleet',
    'resale',
];

export const NavigationGlobal: GlobalConfig = {
    slug: 'navigation',

    fields: [
        {
            name: 'items',
            type: 'array',
            fields: [
                createLinkField(),
                {
                    name: 'subItems',
                    type: 'array',
                    fields: [createLinkField()],
                },
                createImageField(),
            ],
        },
        {
            name: 'socials',
            type: 'array',
            fields: [createLinkField()],
        },
        {
            name: 'contactLinks',
            type: 'array',
            fields: [createLinkField()],
        },
        {
            name: 'search',
            type: 'group',
            fields: [
                {
                    name: 'taxonomyTypes',
                    admin: {
                        description:
                            'Select the taxonomy types which are enabled for search. If left empty, all taxonomy types will be included.',
                    },
                    type: 'select',
                    hasMany: true,
                    options: Object.keys(taxonomyConfigs),
                    defaultValue: DEFAULT_SEARCH_TAXONOMY_TYPES,
                },
                {
                    name: 'placeholder',
                    type: 'text',
                    localized: true,
                },
            ],
        },
    ],
};

defineNavigationConfig({ block: NavigationGlobal });
