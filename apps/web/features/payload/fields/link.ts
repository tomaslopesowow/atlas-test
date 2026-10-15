import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { GroupField } from 'payload';
import { createUrlField } from './url';

const FIELD: GroupField = {
    type: 'group',
    name: 'link',
    admin: {
        description:
            'Choose a page, enter a valid external URL, or specify an anchor link resembling one of the block names. Additionally, provide a title for display.',
    },
    interfaceName: 'Link',
    fields: [
        {
            type: 'row',
            fields: [
                {
                    name: 'type',
                    type: 'radio',
                    options: [
                        {
                            label: 'None',
                            value: 'none',
                        },
                        {
                            label: 'Internal',
                            value: 'internal',
                        },
                        {
                            label: 'External',
                            value: 'external',
                        },
                        {
                            label: 'Anchor',
                            value: 'anchor',
                        },
                    ],
                    defaultValue: 'none',
                    admin: {
                        width: '50%',
                        layout: 'horizontal',
                    },
                    hooks: {
                        beforeChange: [
                            ({ siblingData, value }) => {
                                // Only one of the url or page field should have value at a time.
                                if (['internal', 'none'].includes(value))
                                    siblingData.url = undefined;
                                else if (['external', 'none'].includes(value))
                                    siblingData.page = undefined;
                                return value;
                            },
                        ],
                    },
                },

                {
                    name: 'target',
                    type: 'radio',
                    options: [
                        {
                            label: 'Open in same tab',
                            value: '_self',
                        },
                        {
                            label: 'Open in new tab',
                            value: '_blank',
                        },
                    ],
                    defaultValue: '_self',
                    admin: {
                        width: '50%',
                        condition: (_, { type }) =>
                            type !== 'none' && type !== 'anchor',
                    },
                },
            ],
        },

        {
            type: 'row',
            fields: [
                createUrlField({
                    required: true,
                    admin: {
                        width: '50%',
                        condition: (_, { type }) => type === 'external',
                    },
                }),

                {
                    name: 'anchor',
                    type: 'text',
                    required: true,
                    admin: {
                        width: '50%',
                        description:
                            'The name of the block the anchor link needs to scroll to.',
                        condition: (_, { type }) => type === 'anchor',
                    },
                },

                {
                    name: 'relation',
                    type: 'relationship',
                    label: 'Destination',
                    relationTo: 'pages',
                    required: true,
                    admin: {
                        width: '50%',
                        condition: (_, { type }) => type === 'internal',
                    },
                },

                {
                    name: 'title',
                    type: 'text',
                    localized: true,
                    admin: {
                        width: '50%',
                    },
                },
            ],
        },
    ],
};

export const createLinkField = fieldCreator(FIELD);
