import type { GroupField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createImageField } from './image';
import { createVideoSettingsField } from './video-settings';

const FIELD: GroupField = {
    name: 'video',
    type: 'group',
    interfaceName: 'MediaVideo',
    fields: [
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            filterOptions: {
                mimeType: { contains: 'video' },
            },
        },
        createVideoSettingsField(),
        createImageField({ name: 'posterImage' }),
    ],
};

export const createVideoField = fieldCreator(FIELD);
