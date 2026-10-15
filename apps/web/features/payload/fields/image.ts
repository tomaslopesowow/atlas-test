import type { GroupField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createImageSettingsField } from './image-settings';

const FIELD: GroupField = {
    name: 'image',
    type: 'group',
    interfaceName: 'MediaImage',
    fields: [
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            filterOptions: {
                mimeType: { contains: 'image' },
            },
        },
        createImageSettingsField(),
    ],
};

export const createImageField = fieldCreator(FIELD);
