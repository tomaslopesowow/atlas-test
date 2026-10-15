import type { TextField } from 'payload';
import { fieldCreator } from '@/features/payload/utils/object-composer';
import { createUrlValidator } from '@/features/payload/utils/url-validator';

const FIELD: TextField = {
    type: 'text',
    name: 'url',
    validate: createUrlValidator,
};

export const createUrlField = fieldCreator(FIELD);
