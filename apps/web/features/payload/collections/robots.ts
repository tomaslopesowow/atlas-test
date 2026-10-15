import type { CollectionConfig } from 'payload';

export const Robots: CollectionConfig = {
    slug: 'robots',

    labels: {
        plural: 'Robots',
        singular: 'Robots rule',
    },

    fields: [
        {
            name: 'userAgent',
            type: 'text',
            hasMany: true,
            required: true,
        },

        {
            name: 'allow',
            type: 'text',
            hasMany: true,
        },

        {
            name: 'disallow',
            type: 'text',
            hasMany: true,
        },

        {
            name: 'crawlDelay',
            type: 'number',
        },
    ],
};
