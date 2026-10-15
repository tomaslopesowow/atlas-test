import { createMediaField } from '../../fields/media';
import { createBlock } from '../../utils/create-block';
import thumbnail from './image.png';

export const MediaBlock = createBlock({
    slug: 'media-block',
    imageURL: thumbnail.src,
    labels: {
        singular: 'Media Block',
        plural: 'Media Block',
    },
    fields: [
        createMediaField(),
        {
            name: 'width',
            type: 'select',
            options: ['full', 'wide', 'medium', 'narrow'],
            defaultValue: 'full',
        },
        {
            name: 'position',
            type: 'select',
            options: ['left', 'right', 'center'],
            defaultValue: 'center',
        },
    ],
});
