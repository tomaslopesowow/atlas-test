import type { JSONField } from 'payload';
import { fieldCreator } from '../../../utils/object-composer';
import { MAILCHIMP_EMAIL_FIELD } from '@/utils/shared';

// When implementing, make sure this field can always access siblingData.mailchimpListId
// see apps/web/features/payload/features/mailchimp/fields/mailchimp-list-select.ts
const FIELD = {
    name: 'mailchimpMergeFields',
    label: 'Form fields',
    type: 'json',
    defaultValue: {
        [MAILCHIMP_EMAIL_FIELD.key]: MAILCHIMP_EMAIL_FIELD.name,
    },
    admin: {
        components: {
            Field: '@/features/payload/features/mailchimp/components/merge-fields.tsx',
        },
    },
} satisfies JSONField;

export const createMailchimpMergeFieldsField = fieldCreator(FIELD);
