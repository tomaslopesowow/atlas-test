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
            ],
        },
    ],
};
