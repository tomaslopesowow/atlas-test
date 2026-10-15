import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { headingVariants } from '@/components/common/heading';
import { createLinkField } from '../../payload/fields/link';

const TAXONOMY_TYPE_OPTIONS = ['fleet'] as const;

defineBlockConfig({
    block: {
        slug: 'featured-yachts-grid',
        imageURL: '/admin-assets/block-thumbnails/featured-yachts-grid.png',
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
                name: 'variant',
                type: 'select',
                options: Object.keys(headingVariants.variants.variant),
                defaultValue: 'heading-2',
            },
            {
                name: 'items',
                type: 'relationship',
                relationTo: 'pages',
                hasMany: true,
                filterOptions: {
                    taxonomyType: {
                        in: TAXONOMY_TYPE_OPTIONS,
                    },
                },
            },
            createLinkField(),
        ],
    },
});
