import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createImageField } from '../../payload/fields/image';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        slug: 'logo-cards',
        labels: {
            singular: 'Logo Cards',
            plural: 'Logo Cards',
        },
        imageURL: '/admin-assets/block-thumbnails/logo-cards.png',
        fields: [
            {
                name: 'eyebrow',
                type: 'text',
                localized: true,
            },
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'items',
                type: 'array',
                fields: [
                    createImageField({ name: 'logo' }),
                    { name: 'title', type: 'text', localized: true },
                    createSimpleRichTextField({ name: 'description' }),
                ],
            },
        ],
    },
});
