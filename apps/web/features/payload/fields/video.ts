import type { UploadField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD: UploadField = {
    name: 'video',
    type: 'upload',
    relationTo: 'media',
    filterOptions: {
        mimeType: { contains: 'video' },
    },
};

export const createVideoField = fieldCreator(FIELD);
