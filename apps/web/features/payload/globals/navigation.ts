import type { GlobalConfig } from 'payload';
import { createLinkField } from '../fields/link';

export const Navigation: GlobalConfig = {
    slug: 'navigation',

    fields: [
        {
            name: 'items',
            type: 'array',
            fields: [
                createLinkField(),
                {
                    name: 'children',
                    type: 'array',
                    fields: [createLinkField()],
                },
            ],
        },
    ],
};
