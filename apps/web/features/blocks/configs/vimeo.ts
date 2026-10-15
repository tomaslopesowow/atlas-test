import { defineBlockConfig } from '@/features/blocks/_internal/registry';

export const VIMEO_URL_PATTERN = /^https?:\/\/vimeo\.com\/(\d+)/;

defineBlockConfig({
    block: {
        slug: 'vimeo',
        imageURL: '/admin-assets/block-thumbnails/video.jpg',
        fields: [
            { name: 'title', type: 'text', localized: true },
            {
                name: 'url',
                type: 'text',
                localized: true,
                admin: {
                    description:
                        'Enter a valid Vimeo URL like https://vimeo.com/123456789',
                    placeholder: 'https://vimeo.com/123456789',
                },
                validate: (value: string | null | undefined) => {
                    if (!value) return true;
                    if (!VIMEO_URL_PATTERN.test(value)) {
                        return 'Invalid Vimeo URL';
                    }
                    return true;
                },
            },
        ],
    },
});
