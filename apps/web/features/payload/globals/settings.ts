import type { Field, GlobalConfig } from 'payload';
import { taxonomyConfigs } from '../features/taxonomies/taxonomies';

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
        ...Object.keys(taxonomyConfigs).map(
            (taxonomyType): Field => ({
                name: taxonomyType,
                type: 'group',
                fields: [
                    {
                        name: 'overviewPage',
                        type: 'relationship',
                        relationTo: 'pages',
                    },
                    {
                        name: 'taxonomyType',
                        type: 'text',
                        defaultValue: taxonomyType,
                        admin: {
                            hidden: true,
                        },
                    },
                ],
            }),
        ),
    ],
};
