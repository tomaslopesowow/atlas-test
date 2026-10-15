import type { GlobalConfig } from 'payload';

export const Settings: GlobalConfig = {
    slug: 'settings',

    typescript: {
        interface: 'Settings',
    },

    fields: [
        {
            admin: {
                condition: () => process.env.NEXT_PUBLIC_ECOMMERCE === 'yes',
            },
            name: 'eCommerce',
            label: 'E-Commerce',
            type: 'group',
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
        },
    ],
};
