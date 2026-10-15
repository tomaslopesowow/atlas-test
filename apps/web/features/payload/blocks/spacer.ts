import { createBlock } from '@/features/payload/utils/create-block';
import { createSizeOptions } from '@/features/payload/utils/create-size-options';

export const Spacer = createBlock(
    {
        slug: 'spacer',
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
