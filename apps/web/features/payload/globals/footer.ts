import type { GlobalConfig } from 'payload';
import { createImageField } from '../fields/image';
import { createLinkField } from '../fields/link';

export const Footer: GlobalConfig = {
    slug: 'footer',
    label: 'Footer',

    fields: [
        {
            type: 'tabs',
            tabs: [
                {
                    label: 'Meta',
                    fields: [
                        {
                            name: 'description',
                            type: 'textarea',
                            localized: true,
                            admin: {
                                description:
                                    'This field is for adding a description or supplementary information to the site footer.',
                            },
                        },
                        createImageField({
                            name: 'logo',
                        }),
                    ],
                },
                {
                    label: 'Navigation',
                    fields: [
                        {
                            name: 'links',
                            type: 'array',
                            admin: {
                                description:
                                    'This field allows the creation and management of columns of links. Each group will be displayed in the site footer.',
                            },
                            fields: [
                                {
                                    name: 'title',
                                    label: 'Column title',
                                    type: 'text',
                                    localized: true,
                                    admin: {
                                        description:
                                            'The title of the link group. This could reflect the context in which the links are related.',
                                    },
                                },
                                {
                                    name: 'links',
                                    type: 'array',
                                    localized: true,
                                    fields: [createLinkField()],
                                    admin: {
                                        description:
                                            'List of individual links associated with the group.',
                                    },
                                },
                            ],
                        },

                        {
                            name: 'legal',
                            type: 'array',
                            localized: true,
                            fields: [createLinkField()],
                            admin: {
                                description:
                                    'Links to legal pages such as Terms & Conditions, Privacy Policy, or Cookie Policy.',
                            },
                        },

                        {
                            name: 'socials',
                            type: 'relationship',
                            relationTo: 'socials',
                            hasMany: true,
                        },
                    ],
                },
            ],
        },
    ],
};
