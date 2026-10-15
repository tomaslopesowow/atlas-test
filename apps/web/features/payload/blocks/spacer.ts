import { createSizeOptions } from '@/features/payload/utils/create-size-options';
import { createBlock } from '../utils/create-block';

export const Spacer = createBlock(
    {
        slug: 'spacer',
        imageURL: '/admin-assets/block-thumbnails/spacer.png',
        labels: {
            plural: 'Spacers',
            singular: 'Spacer',
        },

        fields: [
            {
                name: 'size',
                type: 'select',
                defaultValue: '2',
                options: createSizeOptions(9, [
                    'x-small',
                    'small',
                    'medium',
                    'large',
                ]),
                admin: {
                    description:
                        'The Spacer block is used to create a visual gap or space in the layout. It does not carry any semantic meaning.',
                },
            },
        ],
    },
    ['appearance', 'visibility'],
);
