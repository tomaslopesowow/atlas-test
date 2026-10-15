import { createTagsField } from '@/features/payload/fields/tags';
import type { CollectionConfig } from 'payload';
import { createCreatedByField } from '../fields/created-by';
import { createImageField } from '../fields/image';

export const ScrollVideos: CollectionConfig = {
    slug: 'scroll-videos',

    access: {
        read: () => true,
    },

    admin: {
        description:
            'Videos which can be used for Video on Scroll animations. NOTE: transcoding might take a while to optimize the animation experience. Please make sure ALL statuses are "completed" before using the video in a block.',
        defaultColumns: [
            'filename',
            'videoVariants.vp9.status',
            'videoVariants.vp9Mobile.status',
        ],
    },

    upload: {
        staticDir: 'uploads',
    },

    defaultPopulate: {
        fallbackImage: true,
        tags: true,
        createdBy: true,
    },

    fields: [
        createImageField({
            name: 'fallbackImage',
            admin: {
                description:
                    'Image to display if the VOS animation is loading or not supported.',
            },
        }),
        createTagsField(),
        createCreatedByField(),
    ],
};
