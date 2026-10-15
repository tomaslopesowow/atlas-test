import { createMediaField } from '../fields/media';
import { createBlock } from '../utils/create-block';

export const MediaBlock = createBlock({
    slug: 'media-block',
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
