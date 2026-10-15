import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createImageField } from '../../payload/fields/image';
import { createImageRadioField } from '../../payload/fields/image-radio';

defineBlockConfig({
    block: {
        slug: 'duo-image',
        imageURL: '/admin-assets/block-thumbnails/duo-image.png',
        labels: {
            singular: 'Duo Image',
            plural: 'Duo Images',
        },
        fields: [
            createImageRadioField({
                name: 'gridLayout',
                required: true,
                options: Array.from({ length: 4 }).map((_, index) => ({
                    label: `Layout ${index + 1}`,
                    value: `layout-${index + 1}`,
                    image: `/admin-assets/layout-previews/duo-image-${index + 1}.png`,
                })),
            }),
            createImageField({ name: 'image1', label: 'Image 1' }),
            createImageField({
                name: 'image2',
                label: 'Image 2',
            }),
        ],
    },
});
