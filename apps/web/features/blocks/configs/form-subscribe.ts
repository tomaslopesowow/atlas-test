import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createMailchimpListSelectField } from '../../payload/features/mailchimp/fields/mailchimp-list-select';

/**
 * THIS IS ONLY A PLACEHOLDER MODULE FOR THE FORM SUBSCRIBE BLOCK.
 * We can use this as an example or base to build the actual form subscribe block.
 */

defineBlockConfig({
    block: {
        slug: 'form-subscribe',
        imageURL: '/admin-assets/block-thumbnails/rich-text.png',
        fields: [createMailchimpListSelectField()],
    },
});
