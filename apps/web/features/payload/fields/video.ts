import type { GroupField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createImageField } from './image';
import { createUrlField } from './url';
import { createVideoSettingsField } from './video-settings';

const FIELD: GroupField = {
    name: 'video',
    type: 'group',
    interfaceName: 'MediaVideo',
    fields: [
        createUrlField({ label: 'URL' }),
        createVideoSettingsField(),
        createImageField({ name: 'posterImage' }),
    ],
};

export const createVideoField = fieldCreator(FIELD);
