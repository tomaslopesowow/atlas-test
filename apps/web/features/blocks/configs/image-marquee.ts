import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createMediaField } from '../../payload/fields/media';

defineBlockConfig({
    block: {
        slug: 'image-marquee',
        labels: {
            singular: 'Media Marquee',
            plural: 'Media Marquees',
        },
        imageURL: '/admin-assets/block-thumbnails/image-marquee.png',
        fields: [
            {
                name: 'contextual',
                type: 'checkbox',
                defaultValue: false,
                admin: {
                    description:
                        'If enabled, the marquee items will be automatically generated based on page taxonomy context.',
                },
            },
            {
                admin: {
                    condition: (_, siblingData) => !siblingData?.contextual,
                },
                name: 'items',
                type: 'array',
                fields: [createMediaField()],
            },
        ],
    },
});
