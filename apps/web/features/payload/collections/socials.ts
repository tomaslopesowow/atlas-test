import { createUrlField } from '@/features/payload/fields/url';
import type { CollectionConfig } from 'payload';
import { createIconField } from '../fields/icon';

export const Socials: CollectionConfig = {
    slug: 'socials',

    labels: {
        singular: 'Social media',
        plural: 'Social media',
    },

    admin: {
        useAsTitle: 'title',
    },

    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
            localized: true,
            admin: {
                description:
                    'This field is used to set a custom title for the social media link',
            },
        },
        createUrlField({
            name: 'link',
            required: true,
            localized: true,
            admin: {
                description:
                    'This is where you provide the specific URL of the social media profile',
            },
        }),
        createIconField(),
    ],
};
