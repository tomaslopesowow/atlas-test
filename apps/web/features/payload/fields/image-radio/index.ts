import type { RadioField } from 'payload';

type ImageRadioOption = {
    label: string;
    value: string;
    image: string;
};

interface ImageRadioField extends Partial<RadioField> {
    options: ImageRadioOption[];
}

export const createImageRadioField = ({
    options,
    ...config
}: ImageRadioField): RadioField => ({
    ...config,
    name: config.name || 'imageRadio',
    type: 'radio',
    options,
    admin: {
        ...config.admin,
        custom: {
            options,
        },
        components: {
            Field: {
                path: '@/features/payload/fields/image-radio/ImageRadioComponent#ImageRadioComponent',
            },
        },
    },
});
