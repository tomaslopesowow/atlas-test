import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { SelectField } from 'payload';

const FIELD: SelectField = {
    name: 'objectPosition',
    type: 'select',
    defaultValue: 'center',
    options: [
        'top left',
        'top',
        'top right',
        'left',
        'center',
        'right',
        'bottom left',
        'bottom',
        'bottom right',
    ],

    admin: {
        description: 'Specifies the alignment of the object within its box.',
    },
};

export const createImageObjectPositionField = fieldCreator(FIELD);
