import type { GroupField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createIconField } from './icon';

const FIELD: GroupField = {
    name: 'progressIndicator',
    type: 'group',
    admin: {
        position: 'sidebar',
        description:
            'Settings related to a progress indicator on the bottom of the screen.',
    },
    fields: [
        {
            name: 'enabled',
            type: 'checkbox',
            defaultValue: false,
        },
        createIconField({
            admin: {
                condition: (_, siblingData) => siblingData.enabled,
            },
            defaultValue: 'compassNeedle',
        }),
    ],
};

export const createProgressIndicatorField = fieldCreator(FIELD);
