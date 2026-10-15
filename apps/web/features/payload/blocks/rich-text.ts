import { createBlock } from '@/features/payload/utils/create-block';

export const RichText = createBlock({
    slug: 'rich-text',

    fields: [
        {
            name: 'content',
            type: 'richText',
            label: 'Content',
            localized: true,
        },
    ],
});
