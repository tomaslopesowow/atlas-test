import type { TextField } from 'payload';
import { fieldCreator } from '../../../utils/object-composer';

const FIELD = {
    name: 'mailchimpListId',
    label: 'Mailchimp List',
    type: 'text',
    admin: {
        components: {
            Field: '@/features/payload/features/mailchimp/components/list-select.tsx',
        },
    },
} satisfies TextField as TextField;

export const createMailchimpListSelectField = fieldCreator(FIELD);
