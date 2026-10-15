import type { GlobalConfig } from 'payload';
import { createSimpleRichTextField } from '../fields/simple-rich-text';

export const NotFound: GlobalConfig = {
    slug: 'not-found',
    label: 'Not Found',

    fields: [
        {
            name: 'title',
            type: 'text',
            localized: true,
            required: true,
        },
        createSimpleRichTextField({ name: 'description' }),
    ],
};
