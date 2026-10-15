import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { SelectField } from 'payload';

const FIELD: SelectField = {
    name: 'objectFit',
    type: 'select',
    defaultValue: 'cover',
    options: [
        'contain',
        'cover',
        'fill',
        // "none",
        // "scale-down",
    ],

    admin: {
        description:
            'Specifies how the object should be resized to fit its container',
    },
};

export const createImageObjectFitField = fieldCreator(FIELD);
