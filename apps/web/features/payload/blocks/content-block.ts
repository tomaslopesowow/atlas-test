import { createLinkField } from '../fields/link';
import { createMediaField } from '../fields/media';
import { createBlock } from '../utils/create-block';

export const ContentBlock = createBlock({
    slug: 'content',
    imageURL: '/admin-assets/block-thumbnails/content-block.png',
    labels: {
        singular: 'Content Block',
        plural: 'Content Blocks',
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            localized: true,
        },
        {
            name: 'subtitle',
            type: 'text',
            localized: true,
        },
        {
            name: 'text',
            type: 'richText',
            localized: true,
        },
        {
            name: 'buttons',
            type: 'array',
            maxRows: 2,
            fields: [createLinkField()],
        },
        {
            name: 'mediaPosition',
            type: 'select',
            options: ['left', 'right'],
            defaultValue: 'left',
        },
        createMediaField(),
    ],
});
