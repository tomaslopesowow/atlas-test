import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createImageField } from '../../payload/fields/image';
import { createMailchimpListSelectField } from '../../payload/features/mailchimp/fields/mailchimp-list-select';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { createMailchimpMergeFieldsField } from '@/features/payload/features/mailchimp/fields/mailchimp-merge-fields';

defineBlockConfig({
    block: {
        slug: 'mailchimp-form',
        imageURL: '/admin-assets/block-thumbnails/mailchimp-form.png',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            createImageField({ name: 'backgroundImage' }),
            createMailchimpListSelectField({ required: true }),
            createMailchimpMergeFieldsField(),
            {
                name: 'submitButtonText',
                type: 'text',
                localized: true,
                required: true,
            },
            createSimpleRichTextField({ name: 'notice', required: true }),
        ],
    },
});
