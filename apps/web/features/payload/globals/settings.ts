import type { FieldAccess, GlobalConfig } from 'payload';

const isSuperUser: FieldAccess = ({ req }) =>
    !!(req.user as { isSuperUser?: boolean } | null)?.isSuperUser;

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
        {
            name: 'pages',
            type: 'group',
            fields: [
                {
                    name: 'resale',
                    type: 'relationship',
                    relationTo: 'pages',
                },
                {
                    name: 'fleet',
                    type: 'relationship',
                    relationTo: 'pages',
                },
                {
                    name: 'refit',
                    type: 'relationship',
                    relationTo: 'pages',
                },
                {
                    name: 'news',
                    label: 'Insights',
                    type: 'relationship',
                    relationTo: 'pages',
                },
                {
                    name: 'press',
                    label: 'Press',
                    type: 'relationship',
                    relationTo: 'pages',
                },
            ],
        },
        {
            name: 'routeAliases',
            type: 'array',
            label: 'Route Aliases',
            admin: {
                description:
                    'Proxy requests from one page path to another. Sub-paths are included.',
                condition: (_, __, { user }) => !!user?.isSuperUser,
            },
            access: {
                read: isSuperUser,
                create: isSuperUser,
                update: isSuperUser,
            },
            fields: [
                {
                    name: 'source',
                    type: 'relationship',
                    relationTo: 'pages',
                    required: true,
                    admin: {
                        description:
                            'The page whose path will be matched (e.g., /refit)',
                    },
                },
                {
                    name: 'target',
                    type: 'relationship',
                    relationTo: 'pages',
                    required: true,
                    admin: {
                        description:
                            'The page whose content will be served (e.g., /fleet)',
                    },
                },
                {
                    name: 'enabled',
                    type: 'checkbox',
                    defaultValue: true,
                },
            ],
            validate: (value) => {
                if (!value || !Array.isArray(value)) return true;

                type AliasValue = { source?: string | { id?: string } };
                const sources = (value as AliasValue[])
                    .map((alias) =>
                        typeof alias.source === 'string'
                            ? alias.source
                            : alias.source?.id,
                    )
                    .filter(Boolean);

                const uniqueSources = new Set(sources);
                if (sources.length !== uniqueSources.size) {
                    return 'Each source page can only be used once';
                }

                return true;
            },
        },
    ],
};
