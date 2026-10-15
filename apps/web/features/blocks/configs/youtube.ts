import { defineBlockConfig } from '@/features/blocks/_internal/registry';

export const YOUTUBE_URL_PATTERN =
    /^(https?:\/\/(www\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\/)([a-zA-Z0-9_-]+)/;

defineBlockConfig({
    block: {
        slug: 'youtube',
        imageURL: '/admin-assets/block-thumbnails/video.jpg',
        fields: [
            { name: 'title', type: 'text', localized: true },
            {
                name: 'url',
                type: 'text',
                localized: true,
                admin: {
                    description:
                        'Enter a valid YouTube URL like https://www.youtube.com/watch?v=pHsjN3BiJIQ or https://youtu.be/pHsjN3BiJIQ',
                    placeholder: 'https://www.youtube.com/watch?v=pHsjN3BiJIQ',
                },
                validate: (value: string | null | undefined) => {
                    if (!value) return true;
                    if (!YOUTUBE_URL_PATTERN.test(value))
                        return 'Invalid YouTube URL';
                    return true;
                },
            },
        ],
    },
});
