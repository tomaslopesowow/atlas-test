import { createBlock } from '../utils/create-block';

export const CookieTable = createBlock({
    slug: 'cookie-table',
    imageURL: '/admin-assets/block-thumbnails/cookie-table.png',
    labels: {
        singular: 'Cookie table',
        plural: 'Cookie table',
    },
    fields: [
        {
            name: 'title',
            label: 'Title',
            type: 'text',
            localized: true,
        },
        {
            name: 'text',
            label: 'Text',
            type: 'richText',
            localized: true,
        },
        {
            name: 'cookies',
            label: 'Cookies',
            type: 'array',
            labels: {
                singular: 'Cookie',
                plural: 'Cookies',
            },
            fields: [
                {
                    name: 'name',
                    label: 'Cookie Name',
                    type: 'text',
                    localized: true,
                },
                {
                    name: 'term',
                    label: 'Cookie Term',
                    type: 'text',
                    localized: true,
                },
                {
                    name: 'description',
                    label: 'Cookie Description',
                    type: 'textarea',
                    localized: true,
                },
                {
                    name: 'consent_label',
                    label: 'Consent Label',
                    type: 'text',
                    localized: true,
                },
            ],
        },

        {
            name: 'show_edit_preferences',
            label: 'Show edit preferences',
            type: 'checkbox',
        },
        {
            name: 'edit_preferences_title',
            label: 'Edit preferences title',
            type: 'text',
            localized: true,
            admin: {
                condition: (data, siblingData) =>
                    siblingData?.show_edit_preferences,
            },
        },
        {
            name: 'edit_preferences_text',
            label: 'Edit preferences text',
            type: 'textarea',
            localized: true,
            admin: {
                condition: (data, siblingData) =>
                    siblingData?.show_edit_preferences,
            },
        },
    ],
});
