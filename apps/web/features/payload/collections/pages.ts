import { createTagsField } from '@/features/payload/fields/tags';
import { createCollectionLivePreview } from '@/features/payload/utils/create-collection-live-preview';
import type { Page } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import {
    createBreadcrumbsField,
    createParentField,
} from '@payloadcms/plugin-nested-docs';
import {
    MetaDescriptionField,
    MetaImageField,
    MetaTitleField,
    OverviewField,
    PreviewField,
} from '@payloadcms/plugin-seo/fields';
import {
    type AppLocale,
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
    getAlternateLocales,
} from '@repo/i18n/shared';
import type { CollectionConfig, TextFieldSingleValidation } from 'payload';
import { allBlocks } from '../blocks/all';
import { createCreatedByField } from '../fields/created-by';
import { slugField } from '../fields/slug';
import { populatePublishedAt } from '../hooks/populate-published-at';

const SHOPIFY_SYNC_PRODUCTS_BUTTON =
    process.env.NEXT_PUBLIC_ECOMMERCE === 'yes'
        ? [
              {
                  path: '@/features/payload/components/shopify/sync-products-button.tsx',
              },
          ]
        : [];

export const Pages: CollectionConfig = {
    slug: 'pages',

    defaultPopulate: {
        title: true,
        permalink: true,
        path: true,
    },

    indexes: [
        {
            fields: ['path'],
            unique: true,
        },
    ],

    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'publishedAt', 'createdBy'],
        enableRichTextLink: true,

        livePreview: createCollectionLivePreview<Page>(async (doc) =>
            doc.permalink
                ? new URL(doc.permalink)
                : new URL('404', await getSiteUrl()),
        ),
        preview: ({ permalink }) => {
            const url = new URL(permalink as string);
            url.searchParams.set('preview', 'true');
            return url.toString();
        },

        components: {
            beforeList: [...SHOPIFY_SYNC_PRODUCTS_BUTTON],
        },
    },

    versions: {
        drafts: {
            autosave: {
                interval: 1000,
            },
        },
    },

    lockDocuments: {
        duration: 600, // Lock expires after 10 minutes
    },

    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
            localized: true,
            admin: {
                condition: (data) => !data.shopifyProductId,
                description: 'This field is for the headline of your page.',
            },
            hooks: {
                beforeDuplicate: [({ value }) => value && `${value} (Copy)`],
            },
        },

        {
            type: 'tabs',
            tabs: [
                {
                    label: 'Content',
                    fields: [
                        {
                            name: 'blocks',
                            label: 'Layout',
                            type: 'blocks',
                            blocks: allBlocks,
                        },
                    ],
                },
                {
                    name: 'meta',
                    label: 'SEO',
                    fields: [
                        OverviewField({
                            titlePath: 'meta.title',
                            descriptionPath: 'meta.description',
                            imagePath: 'meta.image',
                        }),

                        MetaTitleField({ hasGenerateFn: true }),

                        MetaDescriptionField({}),

                        MetaImageField({ relationTo: 'media' }),

                        PreviewField({
                            hasGenerateFn: true,
                            titlePath: 'meta.title',
                            descriptionPath: 'meta.description',
                        }),
                    ],
                },
            ],
        },

        ...slugField('title', {
            slugOverrides: {
                localized: true,
                admin: {
                    condition: (data) =>
                        !data?.taxonomyData?.product?.shopifyProductId,
                },
            },
        }),

        {
            name: 'publishedAt',
            type: 'date',
            admin: {
                position: 'sidebar',
            },
        },

        {
            name: 'template',
            type: 'relationship',
            relationTo: 'page-templates',
            admin: {
                position: 'sidebar',
                description:
                    'Select a template to define the layout structure and styling of the page.',
            },
        },

        createTagsField(),

        createParentField('pages', {
            admin: {
                position: 'sidebar',
                description:
                    'Parent page of this page; included in the breadcrumb, and the slug will reflect all parent pages.',
            },
        }),

        createCreatedByField(),
        createBreadcrumbsField('pages', { admin: { hidden: true } }),

        // This field is used to determine the path of the page, computed from the breadcrumbs field
        // in afterOperation hook
        {
            name: 'path',
            label: 'Page address created from slug',
            type: 'text',
            localized: true,
            admin: {
                disabled: true,
            },

            validate: (async (value: string, { siblingData, req }) => {
                // draft or no slug -> no validation needed
                if (
                    !value ||
                    (siblingData as Partial<Page>)._status === 'draft'
                ) {
                    return true;
                }

                const pageData = siblingData as Partial<Page>;

                const locales =
                    req.locale === 'all'
                        ? I18N_LOCALES
                        : (getAlternateLocales(
                              req.locale ?? I18N_DEFAULT_LOCALE,
                          ) as AppLocale[]);

                for (const locale of locales) {
                    const localizedPageWithEqualPath = await req.payload
                        .find({
                            collection: 'pages',
                            locale,
                            select: {
                                slug: true,
                                path: true,
                                permalink: true,
                            },
                            where: {
                                id: { not_equals: pageData.id },
                                path: { equals: value },
                            },
                            limit: 1,
                        })
                        .then((res) => res.docs[0]);

                    if (localizedPageWithEqualPath) {
                        return `Localized path "${value}", in locale ${locale} is not unique.`;
                    }
                }

                return true;
            }) as TextFieldSingleValidation,

            hooks: {
                beforeDuplicate: [
                    ({ value, context }) => {
                        context.isDuplicating = true; // Set duplication flag to prevent this path from being overwritten in the beforeChange hook
                        return `${value}-copy-${Date.now()}`;
                    },
                ],
                beforeChange: [
                    ({ data, context }) => {
                        if (context.isDuplicating) {
                            context.isDuplicating = false;
                            return data?.path;
                        }

                        if (data?._status === 'draft' && !data.slug) {
                            // Only populate the path with random UUID for newly created drafts
                            return `/${crypto.randomUUID()}`;
                        }

                        return data?.breadcrumbs?.slice().pop()?.url;
                    },
                ],
            },
        },

        {
            name: 'permalink',
            type: 'text',
            virtual: true,
            admin: { disabled: true },
            hooks: {
                afterRead: [
                    async ({ data, req }) => {
                        const siteUrl = await getSiteUrl();

                        const pageUrlWithLocale = [req.locale, data?.path]
                            .filter(Boolean)
                            .join('/')
                            .replace(/\/{2,}/g, '/');

                        return new URL(pageUrlWithLocale, siteUrl).href;
                    },
                ],
            },
        },
    ],

    hooks: {
        beforeChange: [populatePublishedAt],
    },
};
