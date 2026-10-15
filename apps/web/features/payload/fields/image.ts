import type { UploadField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD: UploadField = {
    name: 'image',
    type: 'upload',
    relationTo: 'media',
    filterOptions: {
        mimeType: { contains: 'image' },
    },
};

export const createImageField = fieldCreator(FIELD);
