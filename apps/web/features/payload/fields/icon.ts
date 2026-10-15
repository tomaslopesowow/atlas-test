import { ICON_MAP } from '@/components/utils/icon-map';
import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { SelectField } from 'payload';

const FIELD: SelectField = {
    name: 'icon',
    type: 'select',
    options: Object.keys(ICON_MAP),

    admin: {
        description: 'Select an icon by name.',
    },
};

export const createIconField = fieldCreator(FIELD);
