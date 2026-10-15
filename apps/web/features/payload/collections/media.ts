import { APIError, type CollectionConfig } from 'payload';
import { createTagsField } from '@/features/payload/fields/tags';
import { createUrlField } from '@/features/payload/fields/url';
import { createCreatedByField } from '../fields/created-by';

const COMMON_FORMAT_OPTIONS = {
    withoutEnlargement: true,
    formatOptions: {
        format: 'webp',
        options: {
            quality: 80,
        },
    },
} as const;

const MAX_FILE_SIZE_MB = 5;

export const Media: CollectionConfig = {
    slug: 'media',

    access: {
        read: () => true,
    },

    defaultPopulate: {
        filename: true,
        mimeType: true,
        filesize: true,
        width: true,
        height: true,
        url: true,
        sizes: true,
    },

    admin: { enableRichTextLink: false },

    upload: {
        staticDir: 'uploads',
        imageSizes: [
            {
                name: 'thumbnail',
                width: 400,
                height: 400,
                fit: 'contain',
                withoutEnlargement: false,
            },
            {
                name: 'w400',
                width: 400,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w640',
                width: 640,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w750',
                width: 750,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w828',
                width: 828,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w1080',
                width: 1080,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w1200',
                width: 1200,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w1920',
                width: 1920,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w2048',
                width: 2048,
                ...COMMON_FORMAT_OPTIONS,
            },
            {
                name: 'w3840',
                width: 3840,
                ...COMMON_FORMAT_OPTIONS,
            },
        ],
        adminThumbnail: 'thumbnail',
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
        {
            name: 'description',
            type: 'text',
            localized: true,
            admin: {
                description:
                    'Add a brief description about the media content here.',
            },
        },
        createUrlField({
            name: 'source',
            admin: {
                readOnly: true,
                condition: (data) => data.source,
            },
        }),
        createTagsField(),
        createCreatedByField(),
        {
            name: 'extra',
            type: 'json',
        },
    ],
};
