import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { headingVariants } from '@/components/common/heading';

defineBlockConfig({
    block: {
        slug: 'section-heading',
        imageURL: '/admin-assets/block-thumbnails/section-heading.png',
        fields: [
            {
                name: 'eyebrow',
                type: 'text',
                localized: true,
            },
            createSimpleRichTextField({ name: 'title' }),
            {
                name: 'subTitle',
                type: 'text',
                localized: true,
            },
            {
                name: 'variant',
                type: 'select',
                options: Object.keys(headingVariants.variants.variant),
                defaultValue: 'heading-4',
            },
        ],
    },
});
