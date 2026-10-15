import type { Field } from 'payload';

export const AI_MEDIA_DESCRIPTION_COLLECTION_FIELDS: Field[] = [
    {
        name: 'description',
        type: 'text',
        localized: true,
        admin: {
            description:
                'Add a brief description about the media content here.',
            components: {
                Field: {
                    path: '@/features/payload/features/ai-media-description/components/media-description#MediaDescriptionComponent',
                },
            },
        },
    },
    {
        name: 'restLocalesDescriptions',
        type: 'json',
        admin: {
            hidden: true,
            disableListColumn: true,
            disableListFilter: true,
        },
    },
    {
        name: 'disableAutoGeneration',
        type: 'checkbox',
        label: 'Disable automatic AI description generation',
        admin: {
            position: 'sidebar',
        },
    },
];
