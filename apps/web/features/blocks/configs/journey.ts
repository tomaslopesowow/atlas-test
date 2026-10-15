import { defineBlockConfig } from '@/features/blocks/_internal/registry';

defineBlockConfig({
    block: {
        slug: 'journey',
        imageURL: '/admin-assets/block-thumbnails/journey.jpg',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'cursorInstruction',
                type: 'text',
                localized: true,
            },
            {
                name: 'navigationSoundEffect',
                type: 'upload',
                localized: true,
                relationTo: 'media',
                filterOptions: {
                    mimeType: { contains: 'audio' },
                },
                admin: {
                    description:
                        'This sound effect will play when the next story is shown.',
                },
            },
            {
                name: 'stories',
                type: 'array',
                maxRows: 3,
                minRows: 3,
                fields: [
                    {
                        name: 'topic',
                        type: 'text',
                        localized: true,
                        required: true,
                    },
                    {
                        name: 'description',
                        type: 'textarea',
                        localized: true,
                        required: true,
                    },
                    {
                        name: 'audio',
                        type: 'upload',
                        localized: true,
                        relationTo: 'media',
                        filterOptions: {
                            mimeType: { contains: 'audio' },
                        },
                        required: true,
                    },
                ],
            },
        ],
    },
});
