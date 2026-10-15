import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { headingVariants } from '@/components/common/heading';

defineBlockConfig({
    block: {
        slug: 'page-heading',
        imageURL: '/admin-assets/block-thumbnails/page-heading.png',
        fields: [
            {
                name: 'subTitle',
                label: { singular: 'Eyebrow', plural: 'Eyebrows' },
                type: 'text',
                localized: true,
            },
            {
                name: 'title',
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
