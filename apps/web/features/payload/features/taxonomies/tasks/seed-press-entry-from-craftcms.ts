/**
 * @module seedPressEntryFromCraftCMS
 *
 * This module provides a PayloadCMS background task for migrating press entries from CraftCMS
 * exports into PayloadCMS. It handles the transformation of CraftCMS press data,
 * media references, and event information into PayloadCMS's page structure.
 *
 * ## Architecture
 *
 * The press entry migration follows a simpler pipeline than articles:
 *
 * ```
 * ┌───────────────────────────┐     ┌──────────────────┐
 * │ seedPressEntryFromCraftCMS│────▶│createUploadFromUrl│
 * │    (Page Creator)          │     │ (Media Handler)  │
 * └───────────────────────────┘     └──────────────────┘
 *       taxonomy-sync                  media-sync
 *          queue                         queue
 * ```
 *
 * ## Key Features
 *
 * - **Media Handling:** Uploads cover images and media kit files (PDFs)
 * - **Event Data:** Maps location, eventStart, and eventEnd fields
 * - **Redirect Creation:** Creates redirects from old CraftCMS URIs
 * - **Media Queue:** Queues all media uploads for async processing
 * - **Deduplication:** Checks for existing media before queueing uploads
 *
 * ## Data Sources
 *
 * The task reads from local JSONL file (extracted from CraftCMS):
 * - `seed/craftcms/press-entries.jsonl` - Press entries with event data and media
 *
 * ## Usage
 *
 * Typically called from a migration script that reads the CraftCMS export:
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'seedPressEntryFromCraftCMS',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         data: pressEntryFromCraftCMS,
 *         parentPageId: pressOverviewPageId,
 *         pageTemplateId: pressTemplateId,
 *     },
 * });
 * ```
 */

import type { TaskConfig, TypedJobs } from 'payload';
import { formatSlug } from '@/features/payload/fields/slug/formatSlug';
import { Schema } from 'effect';
import * as Sentry from '@sentry/nextjs';
import type { Page } from '@/payload-types';
import {
    convertHTMLToLexical,
    editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import {
    processContentBlocks,
    CraftCMSContentBlock,
} from './shared/process-content-blocks';
import { PRESS_INTRODUCTION_EDITOR_CONFIG } from '../taxonomies';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base URL for CraftCMS media files stored in S3.
 * Used to construct full URLs for cover images and related assets.
 */
const S3_AMAZONAWS_URL = 'https://stomp-feadship-prod.s3.amazonaws.com';

// ─────────────────────────────────────────────────────────────────────────────
// Effect Schema Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for CraftCMS press entry exports.
 *
 * This represents the structure of press entries exported from CraftCMS, including:
 * - Entry metadata (id, slug, uri, dates)
 * - Content (title, subtitle, summary, location)
 * - Event data (eventStart, eventEnd)
 * - Relationships (relatedAssets for images and PDFs)
 *
 * @property id - CraftCMS entry ID
 * @property slug - URL slug for the press entry
 * @property uri - Full URI path in CraftCMS
 * @property title - Press entry title/headline
 * @property subtitle - Optional subtitle
 * @property summary - HTML summary/description
 * @property postDate - Publication date
 * @property location - Event location (e.g., "Amsterdam", "Monaco")
 * @property eventStart - Event start date/time
 * @property eventEnd - Event end date/time
 * @property relatedAssets - Cover images and media kit files
 */
type PressEntry = Schema.Schema.Type<typeof PressEntry>;
const PressEntry = Schema.Struct({
    id: Schema.NullishOr(Schema.Number),
    elementId: Schema.NullishOr(Schema.Number),
    sectionId: Schema.NullishOr(Schema.Number),
    sectionName: Schema.NullishOr(Schema.String),
    sectionHandle: Schema.NullishOr(Schema.String),
    typeId: Schema.NullishOr(Schema.Number),
    typeName: Schema.NullishOr(Schema.String),
    typeHandle: Schema.NullishOr(Schema.String),
    author: Schema.NullishOr(
        Schema.Struct({
            firstName: Schema.NullishOr(Schema.String),
            lastName: Schema.NullishOr(Schema.String),
            role: Schema.NullishOr(Schema.String),
            authorSlug: Schema.NullishOr(Schema.String),
        }),
    ),
    slug: Schema.String,
    uri: Schema.String,
    siteId: Schema.Number,
    title: Schema.NullishOr(Schema.String),
    subtitle: Schema.NullishOr(Schema.String),
    summary: Schema.NullishOr(Schema.String),
    postDate: Schema.NullishOr(Schema.Date),
    expiryDate: Schema.NullishOr(Schema.Date),
    dateCreated: Schema.NullishOr(Schema.Date),
    dateUpdated: Schema.NullishOr(Schema.Date),
    eventStart: Schema.NullishOr(Schema.Date),
    eventEnd: Schema.NullishOr(Schema.Date),
    location: Schema.NullishOr(Schema.String),
    contentBlocks: Schema.NullishOr(
        Schema.Array(Schema.NullishOr(CraftCMSContentBlock)),
    ),
    relatedAssets: Schema.NullishOr(
        Schema.Array(
            Schema.NullishOr(
                Schema.Struct({
                    fieldId: Schema.NullishOr(Schema.Number),
                    targetId: Schema.NullishOr(Schema.Number),
                    sortOrder: Schema.NullishOr(Schema.Number),
                    filename: Schema.NullishOr(Schema.String),
                    kind: Schema.NullishOr(Schema.String),
                    alt: Schema.NullishOr(Schema.String),
                    width: Schema.NullishOr(Schema.String),
                    height: Schema.NullishOr(Schema.String),
                    size: Schema.NullishOr(Schema.Number),
                    focalPoint: Schema.NullishOr(Schema.Any),
                    dateCreated: Schema.NullishOr(Schema.Date),
                }),
            ),
        ),
    ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Task Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Log prefix for consistent, searchable log messages */
const SEED_LOG_PREFIX = '[seeding/seedPressEntryFromCraftCMS]';

/**
 * PayloadCMS task configuration for migrating press entries from CraftCMS.
 *
 * This task performs a migration of a single press entry, including:
 * - Basic page creation with press taxonomy
 * - Event data mapping (location, eventStart, eventEnd)
 * - Media upload job queuing (cover images and media kit PDFs)
 * - Redirect creation from old CraftCMS URIs
 *
 * ## Input Schema
 *
 * - `data` (required): CraftCMS press entry JSON matching the PressEntry schema
 * - `parentPageId` (required): ID of the press overview page (parent)
 * - `pageTemplateId` (required): ID of the press entry page template
 *
 * ## Output
 *
 * Returns the created page document, or null if the press entry already exists.
 *
 * ## Error Handling
 *
 * - Retries up to 3 times on failure
 * - Reports failures to Sentry with job context
 * - Skips duplicate press entries (by slug)
 * - Logs extensively for debugging
 *
 * @example
 * // Queue a press entry migration
 * await payload.jobs.queue({
 *     task: 'seedPressEntryFromCraftCMS',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         data: craftcmsPressEntryJson,
 *         parentPageId: 'press-overview-page-id',
 *         pageTemplateId: 'press-template-id',
 *     },
 * });
 */
export const seedPressEntryFromCraftCMSTask: TaskConfig<'seedPressEntryFromCraftCMS'> =
    {
        slug: 'seedPressEntryFromCraftCMS',

        // Retry up to 3 times on failure (network issues, API errors)
        retries: 3,

        /**
         * Input schema defining the expected task inputs.
         * - data: The full CraftCMS press entry JSON
         * - parentPageId: ID of the parent page (press overview)
         * - pageTemplateId: ID of the press entry template
         */
        inputSchema: [
            {
                name: 'data',
                type: 'json',
                required: true,
            },
            {
                name: 'parentPageId',
                type: 'text',
                required: true,
            },
            {
                name: 'pageTemplateId',
                type: 'text',
                required: true,
            },
        ],

        /**
         * Error handler called when all retries are exhausted.
         * Reports the failure to Sentry for monitoring and alerting,
         * including the full job context and input data for debugging.
         */
        onFail: ({ job, input }) => {
            Sentry.captureException(
                new Error('Seed press entry from CraftCMS task failed'),
                {
                    extra: {
                        job,
                        input,
                    },
                },
            );
        },

        /**
         * Main task handler that migrates a CraftCMS press entry to PayloadCMS.
         *
         * ## Processing Flow
         *
         * 1. **Input Validation**: Decode and validate the CraftCMS press entry data
         * 2. **Deduplication**: Check if press entry with same slug already exists
         * 3. **Page Creation**: Create the press entry page with metadata
         * 4. **Redirect Setup**: Create redirect from old CraftCMS URI
         * 5. **Media Processing**: Queue upload jobs for cover images and media kit files
         *    - Cover Image: First image from relatedAssets → taxonomyData.press.cover.media
         *    - Media Kit: PDF files → taxonomyData.press.mediaKit[]
         *    - Check existing media before queueing
         */
        async handler(args) {
            const {
                req: { payload },
            } = args;

            // ─────────────────────────────────────────────────────────────────
            // Initialize Dependencies
            // ─────────────────────────────────────────────────────────────────
            payload.logger.info(`${SEED_LOG_PREFIX} Handler started.`);

            // JSDOM is dynamically imported to avoid bundling issues with Next.js.
            // Used for parsing HTML content from summary field.
            const JSDOM = await import('jsdom').then((mod) => mod.JSDOM);
            payload.logger.info(`${SEED_LOG_PREFIX} Imported JSDOM.`);

            // ─────────────────────────────────────────────────────────────────
            // Input Validation & Parsing
            // ─────────────────────────────────────────────────────────────────
            // Decode and validate the CraftCMS press entry data against our schema.
            const input = Schema.decodeUnknownSync(PressEntry, {
                onExcessProperty: 'preserve',
            })(args.input.data);

            payload.logger.info(
                `${SEED_LOG_PREFIX} Decoded input for slug: ${input.slug}`,
            );

            const slug = formatSlug(input.slug ?? '', 'en');
            payload.logger.info(`${SEED_LOG_PREFIX} Formatted slug: ${slug}`);

            const title = input.title?.replaceAll('_', '') ?? '';
            payload.logger.info(
                `${SEED_LOG_PREFIX} Computed title: '${title}'`,
            );

            // Parse summary HTML to extract plain text for SEO description
            const description = input.summary
                ? new JSDOM(input.summary).window.document.body.textContent ||
                  ''
                : '';
            payload.logger.info(
                `${SEED_LOG_PREFIX} Computed description: '${description.slice(0, 60)}...'`,
            );

            // Note: Press taxonomy does not have an author field (unlike news).
            // The author data is preserved in the extracted JSONL for reference.
            if (input.author) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Author (not stored in press taxonomy): ${[input.author.firstName, input.author.lastName].filter(Boolean).join(' ')}`,
                );
            }

            // ─────────────────────────────────────────────────────────────────
            // Deduplication Check
            // ─────────────────────────────────────────────────────────────────
            // Check if a press entry with this slug already exists to avoid duplicates.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Checking for existing press entry with slug: ${slug}`,
            );
            const existingPressEntries = await payload.find({
                collection: 'pages',
                where: {
                    slug: { equals: slug },
                    taxonomyType: { in: ['press', 'news'] },
                },
                limit: 1,
            });

            // Skip migration if press or news entry with same slug already exists
            if (existingPressEntries.totalDocs > 0) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Entry with slug ${input.slug} already exists as ${existingPressEntries.docs[0].taxonomyType}. Skipping.`,
                );
                return { output: null };
            }

            // ─────────────────────────────────────────────────────────────────
            // Press Entry Creation
            // ─────────────────────────────────────────────────────────────────
            // Create the press entry page with taxonomy data
            payload.logger.info(
                `${SEED_LOG_PREFIX} Creating press entry with slug: ${slug}`,
            );

            const editorConfig = await editorConfigFactory.default({
                config: payload.config,
            });

            const createdPressEntry = await payload.create({
                collection: 'pages',
                data: {
                    meta: {
                        title,
                        description,
                    },
                    publishedAt: input.postDate?.toISOString(),
                    _status: 'published',
                    title,
                    slug,
                    taxonomyType: 'press',
                    taxonomyData: {
                        press: {
                            location: input.location,
                            // Introduction will be updated after processing content blocks
                            introduction: {
                                root: {
                                    children: [],
                                    direction: null,
                                    format: '',
                                    indent: 0,
                                    type: 'root',
                                    version: 1,
                                },
                            },
                        },
                    },
                    template: args.input.pageTemplateId,
                    parent: args.input.parentPageId,
                },
            });

            payload.logger.info(
                `${SEED_LOG_PREFIX} Press entry created with id: ${createdPressEntry.id}`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Content Block Processing
            // ─────────────────────────────────────────────────────────────────
            // Use shared content block processing function to transform CraftCMS
            // content blocks into PayloadCMS blocks. This also extracts the
            // introduction from the first paragraph of the first text block.
            const {
                blocks,
                uploadQueueInput: contentBlockUploadQueue,
                introduction: introductionHTML,
            } = await processContentBlocks({
                payload,
                documentId: createdPressEntry.id,
                contentBlocks: input.contentBlocks,
                editorConfig,
                JSDOM,
                logPrefix: SEED_LOG_PREFIX,
            });

            // Convert the introduction HTML to Lexical format
            const introduction = convertHTMLToLexical({
                editorConfig: await editorConfigFactory.fromEditor({
                    config: payload.config,
                    editor: PRESS_INTRODUCTION_EDITOR_CONFIG,
                }),
                html: introductionHTML,
                JSDOM,
            });

            // ─────────────────────────────────────────────────────────────────
            // Redirect Setup
            // ─────────────────────────────────────────────────────────────────
            // Create a 308 (Permanent Redirect) from the old CraftCMS URI to the
            // new PayloadCMS page. This preserves SEO and ensures old links work.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Removing any existing redirect from uri: ${input.uri}`,
            );
            await payload.delete({
                collection: 'redirects',
                where: {
                    from: { equals: input.uri },
                },
            });

            payload.logger.info(
                `${SEED_LOG_PREFIX} Old redirects deleted for uri: ${input.uri}`,
            );

            // Create the redirect from old CraftCMS URI to the new page
            if (input.uri !== createdPressEntry.path) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Creating redirect from old uri: ${input.uri} to page id: ${createdPressEntry.id}`,
                );
                await payload
                    .create({
                        collection: 'redirects',
                        data: {
                            from: input.uri,
                            to: {
                                type: 'reference',
                                reference: {
                                    relationTo: 'pages',
                                    value: createdPressEntry.id,
                                },
                            },
                            type: '308',
                        },
                    })
                    .then(() => {
                        payload.logger.info(
                            `${SEED_LOG_PREFIX} Redirect created from: ${input.uri} to page id: ${createdPressEntry.id}`,
                        );
                    })
                    .catch((error) => {
                        payload.logger.error(
                            `${SEED_LOG_PREFIX} Error creating redirect from: ${input.uri} to page id: ${createdPressEntry.id} - ${error}`,
                        );
                        return null;
                    });
            }

            // ─────────────────────────────────────────────────────────────────
            // Update Press Entry with Blocks and Introduction
            // ─────────────────────────────────────────────────────────────────
            // Now that we have the blocks (with placeholder media fields) and the
            // introduction, update the press entry. The media fields will be
            // populated by the upload queue jobs.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Updating press entry with blocks and introduction, page id: ${createdPressEntry.id}.`,
            );
            await payload
                .update({
                    collection: 'pages',
                    id: createdPressEntry.id,
                    data: {
                        blocks: blocks.map((block) => ({
                            ...block,
                            ...('layout' in block && {
                                layout: {
                                    paddingTop: '1',
                                    paddingBottom: '1',
                                    width: 'fluid',
                                },
                            }),
                            ...(block.blockType === 'rich-text' && {
                                width: 'large',
                            }),
                            ...(block.blockType === 'media-block' && {
                                width: 'full',
                            }),
                        })) as typeof blocks,
                        taxonomyData: {
                            press: {
                                introduction,
                            },
                        },
                    },
                })
                .then(() => {
                    payload.logger.info(
                        `${SEED_LOG_PREFIX} Blocks and introduction updated on press entry ${createdPressEntry.id}`,
                    );
                })
                .catch((error) => {
                    payload.logger.error(
                        { blocks },
                        `${SEED_LOG_PREFIX} Error adding blocks and introduction to press entry: ${error}`,
                    );
                });

            // ─────────────────────────────────────────────────────────────────
            // Queue Content Block Media Uploads
            // ─────────────────────────────────────────────────────────────────
            // Queue all the media upload jobs collected during block processing.
            // These run on the 'media-sync' queue and will update the press entry's
            // block fields with the uploaded media references.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Queueing content block media upload jobs. Total items: ${contentBlockUploadQueue.length}`,
            );

            await Promise.all(
                contentBlockUploadQueue.map((input) =>
                    payload.jobs
                        .queue({
                            task: 'createUploadFromUrl',
                            queue: 'media-sync',
                            input,
                        })
                        .then(() => {
                            payload.logger.info(
                                `${SEED_LOG_PREFIX} Content block media upload job queued for url: ${input.url}`,
                            );
                        }),
                ),
            );

            // ─────────────────────────────────────────────────────────────────
            // Media Kit and Cover Image Processing
            // ─────────────────────────────────────────────────────────────────
            // Process relatedAssets for:
            // 1. Cover image (first image) → taxonomyData.press.cover.media
            // 2. All assets → taxonomyData.press.mediaKit[]

            const uploadQueueInput: Array<
                TypedJobs['tasks']['createUploadFromUrl']['input']
            > = [];

            if (input.relatedAssets && input.relatedAssets.length > 0) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Processing ${input.relatedAssets.length} related assets for media kit upload.`,
                );

                const mediaKitPlaceholder: NonNullable<
                    NonNullable<Page['taxonomyData']>['press']
                >['mediaKit'] = input.relatedAssets.map((asset) => ({
                    id: crypto.randomUUID(),
                    title: asset?.filename || crypto.randomUUID(),
                }));

                // Update the press entry with the media kit placeholder structure
                await payload.update({
                    collection: 'pages',
                    id: createdPressEntry.id,
                    data: {
                        taxonomyData: {
                            press: {
                                mediaKit: mediaKitPlaceholder,
                            },
                        },
                    },
                });

                payload.logger.info(
                    `${SEED_LOG_PREFIX} Created media kit placeholder with ${mediaKitPlaceholder.length} items`,
                );

                for (const [index, asset] of input.relatedAssets.entries()) {
                    if (!asset?.filename) continue;

                    let assetUrl: string | undefined;

                    const cdnUrlCandidates = [
                        new URL(
                            `/craft/media/images/${asset.filename}`,
                            S3_AMAZONAWS_URL,
                        ).href,
                        new URL(
                            `/craft/yachts/images/${asset.filename}`,
                            S3_AMAZONAWS_URL,
                        ).href,
                        new URL(
                            `/craft/media/documents/${asset.filename}`,
                            S3_AMAZONAWS_URL,
                        ).href,
                    ];

                    for (const candidateUrl of cdnUrlCandidates) {
                        payload.logger.info(
                            `${SEED_LOG_PREFIX} Checking URL for asset: ${candidateUrl}`,
                        );

                        try {
                            const res = await fetch(candidateUrl, {
                                method: 'HEAD',
                            });
                            if (res.ok) {
                                assetUrl = candidateUrl;
                                break;
                            }
                        } catch (e) {
                            payload.logger.warn(
                                `${SEED_LOG_PREFIX} Error checking url: ${candidateUrl} - ${e}`,
                            );
                        }
                    }

                    if (!assetUrl) {
                        payload.logger.info(
                            `${SEED_LOG_PREFIX} No available URL responded with 200 for asset: ${asset.filename}`,
                        );
                        continue;
                    }

                    const existingMedia = await payload
                        .find({
                            collection: 'media',
                            where: {
                                source: { equals: assetUrl },
                            },
                            limit: 1,
                        })
                        .then((x) => x.docs.at(0));

                    if (existingMedia) {
                        payload.logger.info(
                            `${SEED_LOG_PREFIX} media already exists. Skipping upload for: ${asset.filename}`,
                        );

                        payload.logger.info(
                            `${SEED_LOG_PREFIX} Linking existing media id: ${existingMedia.id} to press entry id: ${createdPressEntry.id}`,
                        );

                        mediaKitPlaceholder[index].media = existingMedia.id;
                        await payload.update({
                            collection: 'pages',
                            id: createdPressEntry.id,
                            data: {
                                taxonomyData: {
                                    press: {
                                        mediaKit: mediaKitPlaceholder,
                                    },
                                },
                            },
                        });

                        if (index === 0) {
                            payload.logger.info(
                                `${SEED_LOG_PREFIX} Linking existing media id: ${existingMedia.id} as cover media to press entry id: ${createdPressEntry.id}`,
                            );
                            await payload.update({
                                collection: 'pages',
                                id: createdPressEntry.id,
                                data: {
                                    taxonomyData: {
                                        press: {
                                            cover: { media: existingMedia },
                                        },
                                    },
                                },
                            });
                        }
                    } else {
                        payload.logger.info(
                            `${SEED_LOG_PREFIX} Queueing upload for media kit: ${asset.filename}`,
                        );

                        uploadQueueInput.push({
                            url: assetUrl,
                            target: {
                                collection: 'pages',
                                doc: createdPressEntry.id,
                                path: `taxonomyData.press.mediaKit.${uploadQueueInput.length}.media`,
                            },
                        });

                        if (index === 0) {
                            payload.logger.info(
                                `${SEED_LOG_PREFIX} Queueing upload for cover media: ${asset.filename}`,
                            );
                            uploadQueueInput.push({
                                url: assetUrl,
                                target: {
                                    collection: 'pages',
                                    doc: createdPressEntry.id,
                                    path: 'taxonomyData.press.cover.media',
                                },
                            });
                        }
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────────
            // Queue Media Uploads
            // ─────────────────────────────────────────────────────────────────
            payload.logger.info(
                `${SEED_LOG_PREFIX} Queueing media upload jobs. Total items: ${uploadQueueInput.length}`,
            );

            await Promise.all(
                uploadQueueInput.map((input) =>
                    payload.jobs
                        .queue({
                            task: 'createUploadFromUrl',
                            queue: 'media-sync',
                            input,
                        })
                        .then(() => {
                            payload.logger.info(
                                `${SEED_LOG_PREFIX} Media upload job queued for url: ${input.url}`,
                            );
                        }),
                ),
            );

            // Done
            payload.logger.info(
                `${SEED_LOG_PREFIX} Done. Created press entry with slug: ${createdPressEntry.slug}`,
            );

            return {
                output: createdPressEntry,
            };
        },
    };
