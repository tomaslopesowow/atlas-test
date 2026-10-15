import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createMediaField } from '../../payload/fields/media';
import { headingVariants } from '@/components/common/heading';

defineBlockConfig({
    block: {
        slug: 'text-on-media',
        imageURL: '/admin-assets/block-thumbnails/text-on-media.jpg',
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
                required: true,
            },
            {
                name: 'variant',
                type: 'select',
                options: Object.keys(headingVariants.variants.variant),
                defaultValue: 'heading-1',
            },
            {
                name: 'subtitle',
                type: 'text',
                localized: true,
            },
            createMediaField({ required: true }),
        ],
    },
});
