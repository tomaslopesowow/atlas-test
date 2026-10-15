import type { GlobalConfig } from 'payload';
import { createLinkField } from '../fields/link';

export const Navigation: GlobalConfig = {
    slug: 'navigation',

    fields: [
        {
            name: 'mainItems',
            type: 'array',
            fields: [
                createLinkField(),
                {
                    name: 'subItems',
                    type: 'array',
                    fields: [createLinkField()],
                },
            ],
        },
        {
            name: 'featuredItems',
            type: 'array',
            fields: [
                createLinkField(),
                {
                    name: 'variant',
                    type: 'select',
                    options: ['default', 'primary'],
                    defaultValue: 'default',
                },
            ],
        },
    ],
};
