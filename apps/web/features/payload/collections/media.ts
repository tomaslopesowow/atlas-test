import { createTagsField } from '@/features/payload/fields/tags';
import { createUrlField } from '@/features/payload/fields/url';
import type { CollectionConfig } from 'payload';
import { createCreatedByField } from '../fields/created-by';

const COMMON_FORMAT_OPTIONS = {
    withoutEnlargement: true,
    formatOptions: {
        format: 'webp',
        options: {
            quality: 75,
        },
    },
} as const;

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
    ],
};
