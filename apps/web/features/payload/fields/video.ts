import type { GroupField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createUrlField } from './url';
import { createVideoSettingsField } from './video-settings';
import { createImageField } from './image';

const FIELD: GroupField = {
    name: 'video',
    type: 'group',
    interfaceName: 'MediaVideo',
    fields: [
        createUrlField({ label: 'URL' }),
        createVideoSettingsField(),
        createImageField({ name: 'posterImage', label: 'Poster' }),
    ],
};

export const createVideoField = fieldCreator(FIELD);
