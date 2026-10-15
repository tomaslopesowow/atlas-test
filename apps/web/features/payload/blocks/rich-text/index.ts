import { createBlock } from '@/features/payload/utils/create-block';
import thumbnail from './image.png';

export const RichText = createBlock({
    slug: 'rich-text',
    imageURL: thumbnail.src,
    fields: [
        {
            name: 'content',
            type: 'richText',
            label: 'Content',
            localized: true,
        },
    ],
});
