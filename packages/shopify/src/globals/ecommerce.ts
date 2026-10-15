import type { GlobalConfig } from 'payload';

export const Ecommerce: GlobalConfig = {
    slug: 'ecommerce',

    typescript: {
        interface: 'Ecommerce',
    },

    fields: [
        {
            name: 'cartPage',
            type: 'relationship',
            relationTo: 'pages',
        },
        {
            name: 'shopPage',
            type: 'relationship',
            relationTo: 'pages',
        },
    ],
};
