import type { GroupField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createImageField } from './image';
import { createVideoField } from './video';

const FIELD: GroupField = {
    name: 'media',
    type: 'group',
    interfaceName: 'MediaField',
    fields: [
        {
            type: 'radio',
            name: 'type',
            options: [
                { label: 'Image', value: 'image' },
                { label: 'Video', value: 'video' },
            ],
            defaultValue: 'image',
        },
        createImageField({
            admin: {
                condition: (_, siblingData) => siblingData.type === 'image',
            },
        }),
        createVideoField({
            admin: {
                condition: (_, siblingData) => siblingData.type === 'video',
            },
        }),
    ],
};

export const createMediaField = fieldCreator(FIELD);
