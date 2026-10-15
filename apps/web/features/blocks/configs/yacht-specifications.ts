import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import type { SpecificationCategory } from '../components/yacht-specification.shared';

defineBlockConfig({
    block: {
        slug: 'yacht-specifications',
        imageURL: '/admin-assets/block-thumbnails/yacht-specifications.png',
        fields: [
            {
                name: 'customSpecifications',
                type: 'array',
                fields: [
                    {
                        name: 'label',
                        type: 'text',
                        localized: true,
                        required: true,
                    },
                    {
                        name: 'value',
                        type: 'text',
                        localized: true,
                        required: true,
                    },
                    {
                        name: 'category',
                        type: 'select',
                        required: true,
                        options: [
                            'design',
                            'specifications',
                            'propulsion',
                        ] as SpecificationCategory[],
                    },
                ],
            },
        ],
    },
});
