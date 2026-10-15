import type { GlobalConfig } from 'payload';
import { createMailchimpListSelectField } from '../features/mailchimp/fields/mailchimp-list-select';
import { createSimpleRichTextField } from '../fields/simple-rich-text';
import { createLinkField } from '../fields/link';
import { createMailchimpMergeFieldsField } from '../features/mailchimp/fields/mailchimp-merge-fields';

export const Footer: GlobalConfig = {
    slug: 'footer',
    label: 'Footer',

    fields: [
        {
            type: 'tabs',
            tabs: [
                {
                    label: 'General',
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
                        createMailchimpListSelectField(),
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
                            fields: [createLinkField()],
                            admin: {
                                description:
                                    'Links to legal pages such as Terms & Conditions, Privacy Policy, or Cookie Policy.',
                            },
                        },
                    ],
                },
                {
                    label: 'Compass',
                    name: 'compass',
                    fields: [
                        createSimpleRichTextField({
                            name: 'title',
                        }),
                        {
                            name: 'links',
                            type: 'array',
                            maxRows: 5,
                            fields: [createLinkField()],
                        },
                    ],
                },
                {
                    label: 'Newsletter',
                    name: 'newsletter',
                    fields: [
                        {
                            name: 'title',
                            type: 'text',
                            localized: true,
                        },
                        {
                            name: 'buttonText',
                            type: 'text',
                            localized: true,
                        },
                        {
                            name: 'form',
                            type: 'group',
                            fields: [
                                createSimpleRichTextField({
                                    name: 'description',
                                }),
                                {
                                    name: 'submitButtonText',
                                    type: 'text',
                                    localized: true,
                                },
                                createSimpleRichTextField({
                                    name: 'notice',
                                }),
                                createMailchimpListSelectField(),
                                createMailchimpMergeFieldsField(),
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};
