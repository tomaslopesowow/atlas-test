import type { CollectionConfig } from 'payload';

export const FAQ: CollectionConfig = {
    slug: 'faq',

    labels: {
        singular: 'FAQ',
        plural: 'FAQ',
    },

    admin: {
        useAsTitle: 'question',
        hidden: true,
        enableRichTextLink: false,
        enableRichTextRelationship: false,
    },

    fields: [
        {
            name: 'question',
            type: 'text',
            required: true,
            localized: true,
            admin: {
                description: 'The question to be shown',
            },
        },
        {
            name: 'answer',
            type: 'textarea',
            required: true,
            localized: true,
            admin: {
                description: 'The answer to the question',
            },
        },
        {
            name: 'tags',
            type: 'relationship',
            relationTo: 'tags',
            hasMany: true,
            admin: {
                position: 'sidebar',
            },
        },
    ],
};
