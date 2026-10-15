import {
    SOCIALS_SHARE_LINKS,
    SOCIALS_SHARE_LINKS_LABELS,
    type ShareLink,
} from '@/utils/format-share-link';
import type { SelectField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD: SelectField = {
    name: 'shareLinks',
    type: 'select',
    options: Object.keys(SOCIALS_SHARE_LINKS).map((key) => ({
        label: SOCIALS_SHARE_LINKS_LABELS[key as ShareLink],
        value: key,
    })),
    hasMany: true,
    defaultValue: Object.keys(SOCIALS_SHARE_LINKS).splice(0, 2),
};

export const createShareLinksField = fieldCreator(FIELD);
