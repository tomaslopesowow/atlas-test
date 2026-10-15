import { createImageField } from '../fields/image';
import { createLinkField } from '../fields/link';
import { createBlock } from '../utils/create-block';

export const LogoSlider = createBlock({
    slug: 'logoSlider',
    imageURL: '/admin-assets/block-thumbnails/logo-slider.png',
    fields: [
        {
            name: 'logos',
            type: 'array',
            fields: [
                createImageField(),
                {
                    name: 'height',
                    type: 'number',
                    min: 10,
                    max: 100,
                    defaultValue: 20,
                    admin: {
                        description: 'Logo height',
                    },
                },
                createLinkField(),
            ],
        },
    ],
});
