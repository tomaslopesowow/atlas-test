import type { CollectionConfig } from 'payload';
import { createImageField } from '@/features/payload/fields/image';
import { createTagsField } from '@/features/payload/fields/tags';
import { createUrlField } from '@/features/payload/fields/url';

export const People: CollectionConfig = {
    slug: 'people',

    labels: {
        singular: 'Person',
        plural: 'People',
    },

    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'id', 'function'],
        enableRichTextLink: false,
        enableRichTextRelationship: false,
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            admin: {
                description: 'Enter the full name of the person.',
            },
        },
        {
            name: 'function',
            type: 'text',
            localized: true,
            admin: {
                description:
                    'Specify the role, job title, or function of the person.',
            },
        },
        {
            name: 'bio',
            type: 'textarea',
            localized: true,
            admin: {
                description: 'Specify the bio of the person.',
            },
        },
        createImageField({
            admin: {
                description: 'Upload an image of the person.',
            },
        }),
        {
            name: 'socials',
            type: 'array',
            fields: [
                {
                    name: 'icon',
                    type: 'select',
                    options: [
                        {
                            label: 'Instagram',
                            value: 'instagram',
                        },
                        {
                            label: 'Linkedin',
                            value: 'linkedin',
                        },
                        {
                            label: 'Tiktok',
                            value: 'tiktok',
                        },
                        {
                            label: 'X',
                            value: 'x',
                        },
                    ],
                },
                createUrlField(),
            ],
        },
        createTagsField(),
    ],
};
