import type { CollectionConfig } from 'payload';

export const Tags: CollectionConfig = {
    slug: 'tags',

    admin: {
        hidden: true,
        useAsTitle: 'value',
    },

    fields: [
        {
            name: 'value',
            type: 'text',
            required: true,
            unique: true,
            admin: {
                description:
                    'The value to be used for the tag, should be unique',
            },
        },
    ],
};
