import {
    MetaDescriptionField,
    MetaImageField,
    MetaTitleField,
    OverviewField,
    PreviewField,
} from '@payloadcms/plugin-seo/fields';
import type { GlobalConfig } from 'payload';

export const Brand: GlobalConfig = {
    slug: 'brand',
    label: 'Brand',

    fields: [
        {
            type: 'tabs',
            tabs: [
                {
                    label: 'Brand',
                    fields: [
                        {
                            name: 'logo',
                            type: 'upload',
                            relationTo: 'media',
                            filterOptions: {
                                mimeType: { contains: 'image' },
                            },
                        },
                        {
                            name: 'favicon',
                            type: 'upload',
                            relationTo: 'media',
                            filterOptions: {
                                mimeType: { contains: 'image' },
                            },
                        },
                        {
                            name: 'name',
                            type: 'text',
                            localized: true,
                            admin: {
                                description: 'The name of your brand.',
                            },
                        },
                        {
                            name: 'shortDescription',
                            type: 'textarea',
                            localized: true,
                            admin: {
                                description:
                                    'A brief overview about the brand.',
                            },
                        },
                    ],
                },
                {
                    name: 'meta',
                    label: 'SEO',
                    description:
                        'SEO settings are used as fallback for all pages.',
                    fields: [
                        OverviewField({
                            titlePath: 'meta.title',
                            descriptionPath: 'meta.description',
                            imagePath: 'meta.image',
                        }),

                        MetaTitleField({
                            hasGenerateFn: true,
                        }),

                        MetaDescriptionField({
                            hasGenerateFn: true,
                        }),

                        MetaImageField({
                            hasGenerateFn: true,
                            relationTo: 'media',
                        }),

                        PreviewField({
                            // if the `generateUrl` function is configured
                            hasGenerateFn: true,

                            // field paths to match the target field for data
                            titlePath: 'meta.title',
                            descriptionPath: 'meta.description',
                        }),
                    ],
                },
            ],
        },
    ],
};
