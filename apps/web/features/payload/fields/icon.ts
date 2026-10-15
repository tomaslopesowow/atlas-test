import { ICON_MAP } from '@repo/ui/icons/icon-map';
import type { SelectField } from 'payload';
import { fieldCreator } from '@/features/payload/utils/object-composer';

const FIELD: SelectField = {
    name: 'icon',
    type: 'select',
    options: Object.keys(ICON_MAP),

    admin: {
        description: 'Select an icon by name.',
    },
};

export const createIconField = fieldCreator(FIELD);
