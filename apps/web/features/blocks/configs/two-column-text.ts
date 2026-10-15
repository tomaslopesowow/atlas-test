import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        slug: 'two-column-text',
        imageURL: '/admin-assets/block-thumbnails/two-column-text.png',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            createSimpleRichTextField({
                name: 'text',
            }),
        ],
    },
});
