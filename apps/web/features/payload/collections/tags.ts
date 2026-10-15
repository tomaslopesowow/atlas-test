import startCase from 'lodash.startcase';
import type { CollectionConfig } from 'payload';

export const Tags: CollectionConfig = {
    slug: 'tags',

    labels: {
        singular: 'Tag',
        plural: 'Tags',
    },

    admin: {
        useAsTitle: 'label',
        hidden: true,
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
        {
            name: 'label',
            type: 'text',
            localized: true,
            admin: {
                description:
                    'The text to be shown for the tag, will fall back to the value if not set',
            },
        },
    ],

    hooks: {
        beforeChange: [
            ({ data: { label, value } }) => {
                return {
                    value,
                    label: label || startCase(value),
                };
            },
        ],
    },
};
