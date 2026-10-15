import type { GlobalConfig } from 'payload';
export const Integrations: GlobalConfig = {
    slug: 'integrations',

    typescript: {
        interface: 'Integrations',
    },

    fields: [
        {
            type: 'tabs',
            tabs: [
                {
                    name: 'google',
                    fields: [
                        {
                            name: 'tagManagerId',
                            type: 'text',
                        },
                    ],
                },
                {
                    name: 'mailchimp',
                    fields: [
                        {
                            name: 'apiKey',
                            type: 'text',
                        },
                        {
                            name: 'serverPrefix',
                            type: 'text',
                            defaultValue: 'us2',
                            admin: {
                                description: `To find the server prefix, log into your Mailchimp account and look at the URL in your browser. You’ll see something like https://us2.admin.mailchimp.com/; the us2 part is the server prefix. Note that your specific value may be different.`,
                            },
                        },
                    ],
                },
                {
                    name: 'dvdb',
                    label: 'De Voogt DB',
                    fields: [
                        {
                            name: 'baseUrl',
                            type: 'text',
                            defaultValue: 'https://api-test.devoogtdb.nl/',
                        },
                        {
                            name: 'apiKey',
                            type: 'text',
                        },
                    ],
                },
                {
                    name: 'yatco',
                    fields: [
                        {
                            name: 'baseUrl',
                            type: 'text',
                            defaultValue: 'https://api.yatcoboss.com/',
                        },
                        {
                            name: 'apiKey',
                            type: 'text',
                        },
                    ],
                },
            ],
        },
    ],
};
