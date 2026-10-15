import { createBlock } from '../utils/create-block';

export const RichText = createBlock({
    slug: 'rich-text',
    imageURL: '/admin-assets/block-thumbnails/rich-text.png',
    labels: {
        singular: 'Rich Text',
        plural: 'Rich Text',
    },
    fields: [
        {
            name: 'content',
            type: 'richText',
            label: 'Content',
            localized: true,
        },
    ],
});
