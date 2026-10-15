import { APIError, type CollectionConfig } from 'payload';
import { createTagsField } from '@/features/payload/fields/tags';
import { createCreatedByField } from '../fields/created-by';
import { createImageField } from '../fields/image';

const MAX_FILE_SIZE_MB = 25;

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

    hooks: {
        beforeChange: [
            ({ req, operation }) => {
                if (operation === 'create' || operation === 'update') {
                    const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;

                    const contentLengthHeader =
                        req.headers.get('content-length');
                    const contentLength = contentLengthHeader
                        ? Number.parseInt(contentLengthHeader, 10)
                        : null;

                    if (contentLength && contentLength > maxSize) {
                        throw new APIError(
                            `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB. File size: ${(contentLength / (1024 * 1024)).toFixed(2)}MB`,
                            400,
                        );
                    }
                }
            },
        ],
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
