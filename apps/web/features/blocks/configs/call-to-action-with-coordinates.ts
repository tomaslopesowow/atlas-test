import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createLinkField } from '../../payload/fields/link';
import { headingVariants } from '@/components/common/heading';

defineBlockConfig({
    block: {
        slug: 'call-to-action-with-coordinates',
        labels: {
            singular: 'Call to action with coordinates',
            plural: 'Call to actions with coordinates',
        },
        imageURL:
            '/admin-assets/block-thumbnails/call-to-action-with-coordinates.png',
        fields: [
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
                defaultValue: 'display-2',
            },
            {
                name: 'links',
                type: 'array',
                fields: [createLinkField()],
            },
        ],
    },
});
