import type { Block, Field } from 'payload';
import { createImageField } from '../../fields/image';
import { createShopifyProductField as createShopifySelectField } from '../../fields/shopify-product';
import { createShopifyProductField } from '../../fields/sync-shopify-product-page/field';
import { isDeVoogtDataStale } from '../devoogt/config/cache-config';
import { isYatcoDataStale } from '../yatco/config/cache-config';
import {
    BoldFeature,
    FixedToolbarFeature,
    ItalicFeature,
    lexicalEditor,
    LinkFeature,
    ParagraphFeature,
    StrikethroughFeature,
    UnderlineFeature,
} from '@payloadcms/richtext-lexical';
import { NEWS_TAXONOMY_CATEGORIES } from './shared';
import { createUrlField } from '../../fields/url';
import { findBlockConfigs } from '@/features/blocks/_internal/registry';
import { createMediaField } from '../../fields/media';
import { headingVariants } from '@/components/common/heading';
import { BuildProcessSteps } from '@/utils/shared';
import { createSimpleRichTextField } from '../../fields/simple-rich-text';

const TAXONOMY_PRODUCT_FIELDS: Field[] = [
    createShopifyProductField({
        unique: true,
        showSyncProduct: true,
        admin: {
            condition: (data) =>
                !!data?.taxonomyData?.product?.shopifyProductId,
            readOnly: true,
        },
    }),
    {
        name: 'details',
        type: 'array',
        fields: [
            {
                name: 'title',
                type: 'text',
                required: true,
                localized: true,
            },
            {
                name: 'content',
                type: 'richText',
                localized: true,
            },
        ],
    },
    {
        name: 'relatedProducts',
        type: 'group',
        fields: [
            {
                name: 'type',
                type: 'radio',
                options: [
                    {
                        value: 'automatic',
                        label: 'Automatic',
                    },
                    { value: 'manual', label: 'Manual' },
                ],
                defaultValue: 'automatic',
                admin: {
                    description:
                        'Automatic: let Shopify generate the related products. Manual: select products to showcase yourself.',
                },
            },
            createShopifySelectField(
                (field) =>
                    ({
                        ...field,
                        hasMany: true,
                        name: 'manualProducts',
                        admin: {
                            ...field.admin,
                            condition: (
                                _: unknown,
                                siblingData: { type: string },
                            ) => siblingData.type === 'manual',
                        },
                    }) as typeof field,
            ),
        ],
    },
];

export const FLEET_ABOUT_EDITOR_CONFIG = lexicalEditor({
    features: [
        ItalicFeature(),
        BoldFeature(),
        ParagraphFeature(),
        FixedToolbarFeature(),
    ],
});

export const RESALE_ABOUT_EDITOR_CONFIG = lexicalEditor({
    features: [
        ItalicFeature(),
        BoldFeature(),
        ParagraphFeature(),
        FixedToolbarFeature(),
    ],
});

export const PRESS_INTRODUCTION_EDITOR_CONFIG = lexicalEditor({
    features: [
        ItalicFeature(),
        BoldFeature(),
        UnderlineFeature(),
        StrikethroughFeature(),
        ParagraphFeature(),
        LinkFeature(),
        FixedToolbarFeature(),
    ],
});

export const taxonomyConfigs: Record<string, Field[]> = {
    ...(process.env.NEXT_PUBLIC_ECOMMERCE === 'yes' && {
        product: TAXONOMY_PRODUCT_FIELDS,
    }),

    news: [
        {
            name: 'description',
            type: 'textarea',
            localized: true,
        },
        createImageField({
            name: 'cover',
        }),
        {
            name: 'author',
            type: 'relationship',
            relationTo: 'people',
        },
        {
            name: 'category',
            type: 'select',
            hasMany: true,
            options: Object.values(NEWS_TAXONOMY_CATEGORIES),
        },
    ],

    series: [
        createImageField({
            name: 'cover',
        }),
        createUrlField({ name: 'previewVideo' }),
        {
            name: 'episodes',
            type: 'array',
            minRows: 1,
            fields: [
                {
                    name: 'title',
                    type: 'text',
                    localized: true,
                    required: true,
                },
                createUrlField({ name: 'video', required: true }),
            ],
        },
    ],

    press: [
        createImageField({
            name: 'cover',
        }),
        {
            name: 'location',
            type: 'text',
            localized: true,
        },
        {
            name: 'introduction',
            type: 'richText',
            editor: PRESS_INTRODUCTION_EDITOR_CONFIG,
        },
        {
            name: 'mediaKit',
            type: 'array',
            fields: [
                {
                    name: 'title',
                    type: 'text',
                    localized: true,
                },
                {
                    name: 'media',
                    type: 'upload',
                    relationTo: 'media',
                },
            ],
        },
    ],

    cases: [
        {
            name: 'description',
            type: 'textarea',
            localized: true,
        },
        createImageField({
            name: 'cover',
        }),
        {
            name: 'client',
            type: 'text',
            localized: true,
        },
    ],

    fleet: [
        {
            name: 'dvdbReferenceId',
            label: 'De Voogt DB Reference',
            type: 'text',
            admin: {
                readOnly: true,
                components: {
                    Field: '@/features/payload/features/devoogt/components/fleet-yacht-select.tsx',
                },
            },
        },
        {
            name: 'deVoogtData',
            type: 'json',
            admin: {
                hidden: true,
            },
            hooks: {
                afterRead: [
                    /**
                     * Field-level afterRead hook that implements SWR caching.
                     * When data is stale (older than TTL), queues a background refresh task
                     * while immediately returning the cached data.
                     */
                    async ({ value, req, context, siblingData }) => {
                        const pageId = req.routeParams?.id as
                            | string
                            | undefined;
                        const dvdbReferenceId = siblingData?.dvdbReferenceId;
                        const logPrefix = `[deVoogtData/afterRead] page=${pageId ?? 'unknown'}`;

                        // Skip if disabled via context (prevents loops)
                        if (
                            !context.updateDeVoogtData ||
                            context.skipDeVoogtRefreshHook
                        ) {
                            return value;
                        }

                        const fetchedAt = siblingData?.deVoogtDataFetchedAt;

                        // Skip if no reference ID or data is fresh,
                        // or no page ID
                        if (!dvdbReferenceId) return value;
                        if (!isDeVoogtDataStale(fetchedAt)) return value;
                        if (!pageId) return value;

                        // Check if job already queued for this page
                        const existingJob = await req.payload.find({
                            req,
                            collection: 'payload-jobs',
                            limit: 1,
                            where: {
                                and: [
                                    {
                                        taskSlug: {
                                            equals: 'refreshFleetDeVoogtData',
                                        },
                                    },
                                    { 'input.pageId': { equals: pageId } },
                                    {
                                        completedAt: { exists: false },
                                    },
                                ],
                            },
                        });

                        if (existingJob.totalDocs > 0) {
                            req.payload.logger.info(
                                `${logPrefix} Skipping: job already queued`,
                            );
                            return value;
                        }

                        req.payload.logger.info(
                            `${logPrefix} Queueing refresh (dvdbReferenceId: ${dvdbReferenceId})`,
                        );

                        // Fire-and-forget: queue background refresh
                        req.payload.jobs
                            .queue({
                                req,
                                task: 'refreshFleetDeVoogtData',
                                queue: 'taxonomy-sync',
                                input: {
                                    pageId,
                                    dvdbReferenceId: String(dvdbReferenceId),
                                },
                            })
                            .catch((error) => {
                                req.payload.logger.error(
                                    `[deVoogtData/afterRead] Failed to queue refresh: ${error}`,
                                );
                            });

                        return value;
                    },
                ],
            },
        },
        {
            name: 'deVoogtDataFetchedAt',
            type: 'date',
            admin: {
                hidden: true,
                description: 'Last fetched from De Voogt DB',
            },
        },
        {
            name: 'refreshDeVoogtData',
            type: 'ui',
            admin: {
                components: {
                    Field: '@/features/payload/features/devoogt/components/refresh-devoogt-data-button.tsx',
                },
            },
        },
        {
            name: 'projectPage',
            type: 'ui',
            admin: {
                components: {
                    Field: '@/features/payload/features/devoogt/components/fleet-page-taxonomy-link-field.tsx',
                },
            },
        },
        createImageField({
            name: 'cover',
        }),
        {
            name: 'gallery',
            type: 'array',
            label: 'Gallery',
            labels: {
                singular: 'Image',
                plural: 'Images',
            },
            fields: [createImageField()],
        },
        {
            name: 'about',
            type: 'richText',
            editor: FLEET_ABOUT_EDITOR_CONFIG,
            localized: true,
        },
        {
            name: 'refitContent',
            type: 'blocks',
            admin: {
                condition: (data) =>
                    data.taxonomyType === 'fleet' &&
                    !!data.taxonomyData?.fleet?.deVoogtData?.refit_scopes
                        ?.length,
            },
            blocks: [],
            blockReferences: findBlockConfigs('blocks')
                .map(({ block }) => block as Block)
                .sort((a, b) =>
                    (a.labels?.singular ?? a.slug) <
                    (b.labels?.singular ?? b.slug)
                        ? -1
                        : 1,
                ),
        },
    ],

    resale: [
        {
            name: 'yatcoVesselId',
            label: 'Yatco Reference',
            type: 'text',
            admin: {
                readOnly: true,
                components: {
                    Field: '@/features/payload/features/yatco/components/resale-vessel-select.tsx',
                },
            },
        },
        {
            name: 'yatcoBroker',
            type: 'json',
            admin: { hidden: true },
        },
        {
            name: 'hullId',
            type: 'text',
            admin: {
                description:
                    'Optional: Overrules the hull ID from Yatco. Use when the hull ID from Yatco is incorrect.',
            },
        },
        {
            name: 'yatcoData',
            type: 'json',
            admin: { hidden: true },
            hooks: {
                afterRead: [
                    /**
                     * Field-level afterRead hook that implements SWR caching.
                     * When data is stale (older than TTL), queues a background refresh task
                     * while immediately returning the cached data.
                     */
                    async ({ value, req, context, siblingData }) => {
                        const pageId = req.routeParams?.id as
                            | string
                            | undefined;
                        const yatcoVesselId = siblingData?.yatcoVesselId;
                        const logPrefix = `[yatcoData/afterRead] page=${pageId ?? 'unknown'}`;

                        // Skip if disabled via context (prevents loops)
                        if (
                            !context.updateYatcoData ||
                            context.skipYatcoRefreshHook
                        ) {
                            return value;
                        }

                        const fetchedAt = siblingData?.yatcoDataFetchedAt;

                        // Skip if no vessel ID or data is fresh,
                        // or no page ID
                        if (!yatcoVesselId) return value;
                        if (!isYatcoDataStale(fetchedAt)) return value;
                        if (!pageId) return value;

                        // Check if job already queued for this page
                        const existingJob = await req.payload.find({
                            req,
                            collection: 'payload-jobs',
                            limit: 1,
                            where: {
                                and: [
                                    {
                                        taskSlug: {
                                            equals: 'refreshResaleYatcoData',
                                        },
                                    },
                                    { 'input.pageId': { equals: pageId } },
                                    {
                                        completedAt: { exists: false },
                                    },
                                ],
                            },
                        });

                        if (existingJob.totalDocs > 0) {
                            req.payload.logger.info(
                                `${logPrefix} Skipping: job already queued`,
                            );
                            return value;
                        }

                        req.payload.logger.info(
                            `${logPrefix} Queueing refresh (yatcoVesselId: ${yatcoVesselId})`,
                        );

                        // Fire-and-forget: queue background refresh
                        req.payload.jobs
                            .queue({
                                req,
                                task: 'refreshResaleYatcoData',
                                queue: 'taxonomy-sync',
                                input: {
                                    pageId,
                                    yatcoVesselId: String(yatcoVesselId),
                                },
                            })
                            .catch((error) => {
                                req.payload.logger.error(
                                    `[yatcoData/afterRead] Failed to queue refresh: ${error}`,
                                );
                            });

                        return value;
                    },
                ],
            },
        },
        {
            name: 'yatcoDataFetchedAt',
            type: 'date',
            admin: {
                hidden: true,
                description: 'Last fetched from Yatco API',
            },
        },
        {
            name: 'refreshYatcoData',
            type: 'ui',
            admin: {
                components: {
                    Field: '@/features/payload/features/yatco/components/refresh-yatco-data-button.tsx',
                },
            },
        },
        {
            name: 'projectPage',
            type: 'ui',
            admin: {
                components: {
                    Field: '@/features/payload/features/yatco/components/resale-page-taxonomy-link-field.tsx',
                },
            },
        },
        createImageField({
            name: 'cover',
        }),
        {
            name: 'about',
            type: 'richText',
            editor: RESALE_ABOUT_EDITOR_CONFIG,
            localized: true,
        },
    ],
    buildProcess: [
        {
            name: 'step',
            type: 'select',
            options: Object.keys(BuildProcessSteps)
                .filter((key) => Number.isNaN(Number(key)))
                .map((key) => ({
                    label: key,
                    value: key,
                })),
            required: true,
            index: true,
            unique: true,
        },
        createImageField({
            name: 'cover',
        }),
        createSimpleRichTextField({
            name: 'introduction',
        }),

        {
            name: 'parts',
            label: {
                singular: 'Storyline part',
                plural: 'Storyline parts',
            },
            type: 'array',
            fields: [
                {
                    name: 'items',
                    type: 'array',
                    fields: [
                        createMediaField(),
                        {
                            name: 'title',
                            type: 'text',
                            localized: true,
                        },
                        {
                            name: 'variant',
                            type: 'select',
                            options: Object.keys(
                                headingVariants.variants.variant,
                            ),
                            defaultValue: 'heading-7',
                        },
                        createSimpleRichTextField({ name: 'description' }),
                        {
                            name: 'sheet',
                            type: 'group',
                            fields: [
                                {
                                    name: 'enabled',
                                    type: 'checkbox',
                                },
                                {
                                    name: 'linkTitle',
                                    type: 'text',
                                    localized: true,
                                    admin: {
                                        condition: (_, siblingData) =>
                                            siblingData?.enabled,
                                    },
                                },
                                {
                                    name: 'items',
                                    type: 'array',
                                    fields: [
                                        createMediaField(),
                                        {
                                            name: 'title',
                                            type: 'text',
                                            localized: true,
                                        },
                                        createSimpleRichTextField({
                                            name: 'content',
                                        }),
                                    ],
                                    admin: {
                                        condition: (_, siblingData) =>
                                            siblingData?.enabled,
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};
