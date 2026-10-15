import { createImageObjectFitField } from '@/features/payload/fields/object-fit';
import { createImageObjectPositionField } from '@/features/payload/fields/object-position';
import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { CollapsibleField } from 'payload';

const FIELD = Object.freeze<CollapsibleField>({
    label: 'Image settings',
    type: 'collapsible',
    admin: {
        initCollapsed: true,
        description:
            'These settings allow you to customize the image properties. You can adjust parameters such as preloading the image for a more optimized user experience.',
    },
    fields: [
        createImageObjectFitField(),
        createImageObjectPositionField(),
        {
            name: 'imagePreload',
            label: 'Preload',
            type: 'checkbox',
            admin: {
                description:
                    'This option determines whether the image(s) should be preloaded. Preloading is advisable when the image(s) are located above the fold or contribute significantly to the largest contentful paint.',
            },
        },
    ],
});

export const createImageSettingsField = fieldCreator(FIELD);
