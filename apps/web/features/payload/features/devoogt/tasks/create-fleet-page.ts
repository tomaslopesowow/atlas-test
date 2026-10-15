/**
 * @module createFleetPage
 *
 * This module provides a PayloadCMS background task for creating fleet yacht pages
 * from De Voogt DB (DVDB) data. It acts as the "Tier 2" task in the fleet sync pipeline,
 * handling individual yacht page creation and cover image enrichment.
 *
 * ## Architecture
 *
 * The fleet synchronization follows a multi-stage pipeline:
 *
 * ```
 * ┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
 * │   syncFleet     │────▶│ createFleetPage │────▶│createUploadFromUrl│
 * │  (Orchestrator) │     │ (Page Creator)  │     │ (Media Handler)  │
 * └─────────────────┘     └─────────────────┘     └──────────────────┘
 *      nightly             taxonomy-sync               media-sync
 *       queue                  queue                    queue
 *                                    ← This task
 * ```
 *
 * This task is queued by `syncFleet` for each yacht that needs a page created.
 *
 * ## Key Features
 *
 * - **Page Deduplication:** If a page with the same dvdbReferenceId exists, updates its deVoogtData instead of creating a new page
 * - **Slug Collision Handling:** Appends numbers to slugs when duplicates are detected
 * - **Page Template Assignment:** Uses the standard yacht page template
 * - **Taxonomy Data:** Stores the De Voogt ID for future sync/updates
 * - **Cover Image Enrichment:** Queues cover image upload from CraftCMS export data
 *
 * ## Data Flow
 *
 * 1. Receives De Voogt ID from sync task
 * 2. Fetches full yacht details from De Voogt DB API
 * 3. Checks for existing page with same dvdbReferenceId
 *    - If exists: Updates deVoogtData with fresh data and returns
 *    - If not: Continues to create new page
 * 4. Creates new page with yacht data and template
 * 5. Looks up yacht in CraftCMS export data (unique-yachts.jsonl)
 * 6. Queues cover image upload job to media-sync queue
 *
 * ## Usage
 *
 * Typically queued by `syncFleet`, but can be manually triggered:
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'createFleetPage',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         dvdbReferenceId: 'DV-12345',
 *     },
 * });
 * ```
 */

import type { TaskConfig } from 'payload';
import { FLEET_TEMPLATE_TITLE } from '@/features/payload/collections/page-templates';
import { formatSlug } from '@/features/payload/fields/slug/formatSlug';
import { getDVDBClient } from '../utils/devoogtdb-client';
import {
    findYachtByDvdbId,
    resolveYachtImageUrl,
} from '../utils/yacht-data-loader';
import * as Sentry from '@sentry/nextjs';
import { Effect, Option } from 'effect';
import {
    convertHTMLToLexical,
    editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import { FLEET_ABOUT_EDITOR_CONFIG } from '../../taxonomies/taxonomies';
import type { Page } from '@/payload-types';
import { asDoc } from '@/features/payload/utils/as-doc';
import {
    InputValidationError,
    DeVoogtAPIError,
    TemplateNotFoundError,
    ParentPageNotFoundError,
    DatabaseQueryError,
    PageOperationError,
    ContentConversionError,
    CraftCMSLookupError,
    RedirectOperationError,
    MediaOperationError,
    JobQueueError,
    UnexpectedError,
    SlugCollisionError,
} from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Task Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Log prefix for consistent, searchable log messages */
const LOG_PREFIX = '[fleet/createFleetPage]';

/**
 * PayloadCMS task configuration for creating fleet yacht pages from De Voogt DB data.
 *
 * This task creates individual fleet pages for yachts, with deduplication logic
 * to prevent duplicate pages, slug collision handling, and automatic cover image enrichment.
 *
 * ## Input Schema
 *
 * - `dvdbReferenceId` (optional): The De Voogt DB reference ID for the yacht
 *
 * ## Output
 *
 * Returns `{ success: true, pageId: string }` on completion.
 *
 * ## Page Structure
 *
 * Created pages have:
 * - `taxonomyType`: 'fleet'
 * - `taxonomyData.fleet.dvdbReferenceId`: The De Voogt ID for future reference
 * - `taxonomyData.fleet.cover.media`: Cover image (queued for async upload)
 * - `template`: Reference to the yacht page template
 * - `navigationInset`: true (for visual presentation)
 *
 * ## Cover Image Enrichment
 *
 * After page creation, the task:
 * 1. Looks up the yacht in the CraftCMS export data (unique-yachts.jsonl)
 * 2. Extracts gallery images from gallery.imagesExterior and gallery.imagesInterior
 * 3. Constructs an S3 URL to the original image
 * 4. Queues a `createUploadFromUrl` job to download and attach the image
 *
 * The cover image upload is handled asynchronously on the `media-sync` queue.
 *
 * @example
 * // Queue a fleet page creation
 * await payload.jobs.queue({
 *     task: 'createFleetPage',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         dvdbReferenceId: 'DV-12345',
 *     },
 * });
 */
export const createFleetPageTask: TaskConfig<'createFleetPage'> = {
    slug: 'createFleetPage',

    // Retry up to 3 times on failure (API unavailability, network issues)
    retries: 3,

    /**
     * Input schema defining the expected task inputs.
     * The dvdbReferenceId identifies which yacht to create a page for.
     */
    inputSchema: [
        {
            name: 'slug',
            type: 'text',
        },
        {
            name: 'dvdbReferenceId',
            type: 'text',
        },
    ],

    /**
     * Fallback error handler for unexpected failures that escape Effect error handling.
     * Expected errors are caught and reported via Effect.catchTags in the handler.
     * This onFail hook serves as a safety net for truly unexpected errors.
     */
    onFail: ({ job, input }) => {
        Sentry.captureException(
            new Error('Create fleet page task failed with unexpected error.'),
            {
                level: 'error',
                extra: {
                    job,
                    input,
                },
            },
        );
    },

    /**
     * Main task handler that creates a fleet page for a yacht.
     *
     * Uses Effect.gen for explicit error handling with typed errors. All expected
     * errors are caught via Effect.catchTags and reported to Sentry with rich context.
     *
     * The handler follows this flow:
     * 1. Validate the De Voogt ID input
     * 2. Fetch yacht details from De Voogt DB API
     * 3. Find the yacht page template
     * 4. Check for existing page with same dvdbReferenceId (deduplication)
     * 5. Check for slug collisions and increment if needed
     * 6. Create the page with taxonomy data
     * 7. Look up yacht in CraftCMS export data (JSONL)
     * 8. Queue cover image upload job to media-sync queue
     *
     * @returns Promise<{ output: { success: true, pageId: string } }> on success
     * @returns Promise<{ output: { success: false, error: string } }> on expected errors
     */
    handler(args) {
        const {
            req: { payload },
        } = args;

        const unsafeProgram = Effect.gen(function* () {
            // ─────────────────────────────────────────────────────────────────
            // Initialize Dependencies
            // ─────────────────────────────────────────────────────────────────
            payload.logger.info(`${LOG_PREFIX} Handler started.`);

            const dvdbClient = yield* Effect.tryPromise({
                try: async () => await getDVDBClient(payload),
                catch: (cause) =>
                    new UnexpectedError({
                        message: 'Failed to initialize DVDB client',
                        context: 'getDVDBClient',
                        cause,
                    }),
            });

            const deVoogtId = args.input.dvdbReferenceId;

            payload.logger.info(
                `${LOG_PREFIX} Initialized DVDB client for De Voogt ID: ${deVoogtId}`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Input Validation
            // ─────────────────────────────────────────────────────────────────
            // The De Voogt ID is required to identify which yacht to process
            if (!deVoogtId) {
                payload.logger.error(
                    `${LOG_PREFIX} De Voogt ID is required but not provided.`,
                );
                return yield* Effect.fail(
                    new InputValidationError({
                        field: 'dvdbReferenceId',
                        message: 'De Voogt ID is required',
                        providedValue: deVoogtId,
                    }),
                );
            }

            // ─────────────────────────────────────────────────────────────────
            // Fetch Yacht Details
            // ─────────────────────────────────────────────────────────────────
            // Query the De Voogt DB API for the full yacht record
            payload.logger.info(
                `${LOG_PREFIX} Fetching yacht details from DVDB API...`,
            );

            const yacht = yield* Effect.tryPromise({
                try: async () => {
                    const result = await dvdbClient?.FleetData.DeVoogtID({
                        deVoogtID: String(deVoogtId),
                    });
                    if (!result) {
                        throw new Error(
                            `Yacht with De Voogt ID ${deVoogtId} not found`,
                        );
                    }
                    return result;
                },
                catch: (cause) => {
                    payload.logger.error(
                        `${LOG_PREFIX} Yacht with De Voogt ID ${deVoogtId} not found in DVDB.`,
                    );
                    return new DeVoogtAPIError({
                        dvdbReferenceId: String(deVoogtId),
                        operation: 'FleetData.DeVoogtID',
                        cause,
                    });
                },
            });

            const yachtTitle =
                yacht.launch_name ||
                String(yacht.hull ?? `Unknown - DVDB ID ${yacht.devoogt_id}`);

            payload.logger.info(
                `${LOG_PREFIX} Fetched yacht: "${yachtTitle}" (DVDB ID: ${yacht.devoogt_id}, Hull: ${yacht.hull ?? 'N/A'})`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Find Page Template
            // ─────────────────────────────────────────────────────────────────
            // Look up the yacht page template by its title. This template defines
            // the structure and layout for fleet yacht pages.
            payload.logger.info(
                `${LOG_PREFIX} Looking up yacht page template: "${FLEET_TEMPLATE_TITLE}"`,
            );

            const pageTemplate = yield* Effect.tryPromise({
                try: async () => {
                    const { docs } = await payload.find({
                        collection: 'page-templates',
                        where: {
                            title: {
                                equals: FLEET_TEMPLATE_TITLE,
                            },
                        },
                        limit: 1,
                    });
                    const template = docs.at(0);
                    if (!template) {
                        throw new Error('Template not found');
                    }
                    return template;
                },
                catch: () => {
                    const message = `Yacht page template with title ${FLEET_TEMPLATE_TITLE} not found.`;
                    payload.logger.error(`${LOG_PREFIX} ${message}`);
                    return new TemplateNotFoundError({
                        templateTitle: FLEET_TEMPLATE_TITLE,
                        message,
                    });
                },
            });

            payload.logger.info(
                `${LOG_PREFIX} Found page template with ID: ${pageTemplate.id}`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Find parent page
            // ─────────────────────────────────────────────────────────────────
            payload.logger.info(`${LOG_PREFIX} Looking up parent page`);

            const parent = yield* Effect.tryPromise({
                try: async () => {
                    const settings = await payload.findGlobal({
                        slug: 'settings',
                    });
                    const fleetPage = settings.pages?.fleet;
                    if (!fleetPage) {
                        throw new Error('Fleet overview page not found');
                    }
                    return fleetPage;
                },
                catch: () => {
                    const message = `Fleet overview page not found.`;
                    payload.logger.error(`${LOG_PREFIX} ${message}`);
                    return new ParentPageNotFoundError({
                        settingsPath: 'pages.fleet',
                        message,
                    });
                },
            });

            payload.logger.info(
                `${LOG_PREFIX} Found parent page with ID: ${asDoc(parent)?.id}`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Page Deduplication Check
            // ─────────────────────────────────────────────────────────────────
            // Check if a page already exists with this De Voogt ID. If so, update
            // the deVoogtData with fresh data from the DVDB API instead of creating
            // a new page. The dvdbReferenceId is stored in taxonomyData.fleet.
            payload.logger.info(
                `${LOG_PREFIX} Checking for existing page with DVDB ID: ${yacht.devoogt_id}`,
            );

            const existing = yield* Effect.tryPromise({
                try: async () => {
                    const { docs } = await payload.find({
                        collection: 'pages',
                        where: {
                            'taxonomyData.fleet.dvdbReferenceId': {
                                equals: String(yacht.devoogt_id),
                            },
                        },
                        limit: 1,
                    });
                    return docs.at(0);
                },
                catch: (cause) =>
                    new DatabaseQueryError({
                        collection: 'pages',
                        operation: 'find',
                        query: {
                            'taxonomyData.fleet.dvdbReferenceId': String(
                                yacht.devoogt_id,
                            ),
                        },
                        cause,
                    }),
            });

            if (existing) {
                payload.logger.info(
                    `${LOG_PREFIX} Page already exists for yacht "${yachtTitle}" (Page ID: ${existing.id}). Updating deVoogtData.`,
                );

                // Update deVoogtData with fresh data from DVDB API
                yield* Effect.tryPromise({
                    try: async () =>
                        await payload.update({
                            collection: 'pages',
                            id: existing.id,
                            context: { skipDeVoogtRefreshHook: true },
                            data: {
                                taxonomyData: {
                                    fleet: {
                                        deVoogtData: yacht,
                                        deVoogtDataFetchedAt:
                                            new Date().toISOString(),
                                    },
                                },
                            },
                        }),
                    catch: (cause) =>
                        new PageOperationError({
                            operation: 'update',
                            pageId: existing.id,
                            title: yachtTitle,
                            dvdbReferenceId: String(yacht.devoogt_id),
                            cause,
                        }),
                });

                payload.logger.info(
                    `${LOG_PREFIX} Updated deVoogtData for existing page (Page ID: ${existing.id})`,
                );

                // ─────────────────────────────────────────────────────────────
                // Ensure Redirect Exists for Existing Pages
                // ─────────────────────────────────────────────────────────────
                // Check if a redirect from the old CraftCMS URI exists. If not,
                // create one to ensure old links continue to work.
                const yachtData = yield* Effect.tryPromise({
                    try: async () => await findYachtByDvdbId(yacht.devoogt_id),
                    catch: (cause) =>
                        new CraftCMSLookupError({
                            dvdbReferenceId: String(yacht.devoogt_id),
                            source: 'unique-yachts.jsonl',
                            cause,
                        }),
                });

                if (yachtData?.uri) {
                    // Store URI in const for type narrowing
                    const uri = yachtData.uri;

                    // Check if redirect already exists
                    const existingRedirect = yield* Effect.tryPromise({
                        try: async () => {
                            const { docs } = await payload.find({
                                collection: 'redirects',
                                where: {
                                    from: { equals: uri },
                                },
                                limit: 1,
                            });
                            return docs.at(0);
                        },
                        catch: (cause) =>
                            new RedirectOperationError({
                                operation: 'query',
                                uri,
                                cause,
                            }),
                    });

                    if (!existingRedirect) {
                        payload.logger.info(
                            `${LOG_PREFIX} No redirect exists for URI: ${uri}. Creating one.`,
                        );

                        yield* Effect.tryPromise({
                            try: async () =>
                                await payload.create({
                                    collection: 'redirects',
                                    data: {
                                        from: uri,
                                        to: {
                                            type: 'reference',
                                            reference: {
                                                relationTo: 'pages',
                                                value: existing.id,
                                            },
                                        },
                                        type: '308',
                                    },
                                }),
                            catch: (cause) => {
                                payload.logger.error(
                                    `${LOG_PREFIX} Error creating redirect from: ${uri} to page id: ${existing.id} - ${cause}`,
                                );
                                return new RedirectOperationError({
                                    operation: 'create',
                                    uri,
                                    pageId: existing.id,
                                    cause,
                                });
                            },
                        });

                        payload.logger.info(
                            `${LOG_PREFIX} Redirect created from: ${uri} to page id: ${existing.id}`,
                        );
                    } else {
                        payload.logger.info(
                            `${LOG_PREFIX} Redirect already exists for URI: ${uri}`,
                        );
                    }
                }

                return {
                    output: {
                        success: true,
                        pageId: existing.id,
                    },
                };
            }

            // ─────────────────────────────────────────────────────────────────
            // Prepare Page Title & Slug
            // ─────────────────────────────────────────────────────────────────
            // Use the yacht's launch name if available, otherwise fall back to
            // hull number or a generic identifier.
            const title = yachtTitle;
            const slug = args.input.slug ?? formatSlug(title);

            payload.logger.info(
                `${LOG_PREFIX} Computed title: "${title}" and slug: "${slug}"`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Slug Collision Detection
            // ─────────────────────────────────────────────────────────────────
            // Check for existing pages with the same title or slug. If found,
            // append a number to make the slug unique.
            payload.logger.info(
                `${LOG_PREFIX} Checking for slug collisions...`,
            );

            const duplicates = yield* Effect.tryPromise({
                try: async () =>
                    await payload.find({
                        collection: 'pages',
                        where: {
                            taxonomyType: { equals: 'fleet' },
                            slug: { equals: slug },
                        },
                    }),
                catch: (cause) =>
                    new DatabaseQueryError({
                        collection: 'pages',
                        operation: 'find',
                        query: { taxonomyType: 'fleet', slug },
                        cause,
                    }),
            });

            // Fail if duplicates exist — slug deduplication is handled by syncFleet
            if (duplicates.totalDocs > 0) {
                payload.logger.info(
                    `${LOG_PREFIX} Found ${duplicates.totalDocs} duplicate(s) for slug: "${slug}"`,
                );
                yield* Effect.fail(
                    new SlugCollisionError({
                        slug,
                        duplicates: duplicates.docs.map((page) => page.id),
                    }),
                );
            } else {
                payload.logger.info(
                    `${LOG_PREFIX} No slug collisions detected. Using slug: "${slug}"`,
                );
            }

            // ─────────────────────────────────────────────────────────────────
            // Create Fleet Page
            // ─────────────────────────────────────────────────────────────────
            // Create the new page with:
            // - taxonomyType: 'fleet' to identify it as a fleet yacht page
            // - taxonomyData.fleet.dvdbReferenceId: for future sync/deduplication
            // - template: the yacht page template for consistent layout
            // - navigationInset: true for visual presentation
            payload.logger.info(
                `${LOG_PREFIX} Creating page for yacht "${title}"...`,
            );

            const JSDOM = yield* Effect.tryPromise({
                try: async () => (await import('jsdom')).JSDOM,
                catch: (cause) =>
                    new UnexpectedError({
                        message: 'Failed to import JSDOM',
                        context: 'import jsdom',
                        cause,
                    }),
            });

            // Convert about HTML to Lexical if present
            let about:
                | Awaited<ReturnType<typeof convertHTMLToLexical>>
                | undefined;
            if (yacht.about) {
                const aboutHtml = yacht.about; // Type narrowing
                about = yield* Effect.tryPromise({
                    try: async () => {
                        const editorConfig =
                            await editorConfigFactory.fromEditor({
                                config: payload.config,
                                editor: FLEET_ABOUT_EDITOR_CONFIG,
                            });
                        return convertHTMLToLexical({
                            editorConfig,
                            html: aboutHtml,
                            JSDOM,
                        });
                    },
                    catch: (cause) =>
                        new ContentConversionError({
                            html: aboutHtml.substring(0, 500),
                            field: 'about',
                            cause,
                        }),
                });
            }

            const created = yield* Effect.tryPromise({
                try: async () =>
                    await payload.create({
                        collection: 'pages',
                        data: {
                            title,
                            slug,
                            taxonomyType: 'fleet' as const,
                            taxonomyData: {
                                fleet: {
                                    // Store the De Voogt ID for future reference and deduplication
                                    dvdbReferenceId: String(yacht.devoogt_id),
                                    about,
                                },
                            },
                            meta: {
                                title,
                                description: yacht.about
                                    ? new JSDOM(yacht.about).window.document
                                          .body.textContent
                                    : undefined,
                            },
                            // Enable navigation inset for yacht page visual style
                            navigationInset: true,
                            template: pageTemplate.id,
                            parent,
                        },
                    }),
                catch: (cause) =>
                    new PageOperationError({
                        operation: 'create',
                        title,
                        dvdbReferenceId: String(yacht.devoogt_id),
                        cause,
                    }),
            });

            payload.logger.info(
                `${LOG_PREFIX} Created page successfully (Page ID: ${created.id}, Slug: ${slug})`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Enrich with De Voogt DB Data
            // ─────────────────────────────────────────────────────────────────
            // Store the full DVDB yacht data in taxonomyData.fleet.deVoogtData
            // for faster access without API calls.
            payload.logger.info(
                `${LOG_PREFIX} Enriching page with De Voogt DB data...`,
            );

            yield* Effect.tryPromise({
                try: async () =>
                    await payload.update({
                        collection: 'pages',
                        id: created.id,
                        context: { skipDeVoogtRefreshHook: true },
                        data: {
                            taxonomyData: {
                                fleet: {
                                    deVoogtData: yacht,
                                    deVoogtDataFetchedAt:
                                        new Date().toISOString(),
                                },
                            },
                        },
                    }),
                catch: (cause) =>
                    new PageOperationError({
                        operation: 'update',
                        pageId: created.id,
                        title,
                        dvdbReferenceId: String(yacht.devoogt_id),
                        cause,
                    }),
            });

            payload.logger.info(
                `${LOG_PREFIX} De Voogt DB data enrichment complete.`,
            );

            // ─────────────────────────────────────────────────────────────────
            // CraftCMS Data Lookup
            // ─────────────────────────────────────────────────────────────────
            // Look up yacht data from the CraftCMS export. This data is used for:
            // 1. Creating redirects from old CraftCMS URIs
            // 2. Enriching the page with cover images and gallery
            payload.logger.info(
                `${LOG_PREFIX} Looking up yacht in CraftCMS export data (DVDB ID: ${yacht.devoogt_id})`,
            );

            const yachtData = yield* Effect.tryPromise({
                try: async () => await findYachtByDvdbId(yacht.devoogt_id),
                catch: (cause) =>
                    new CraftCMSLookupError({
                        dvdbReferenceId: String(yacht.devoogt_id),
                        source: 'unique-yachts.jsonl',
                        cause,
                    }),
            });

            // ─────────────────────────────────────────────────────────────────
            // Redirect Setup
            // ─────────────────────────────────────────────────────────────────
            // Create a 308 (Permanent Redirect) from the old CraftCMS URI to the
            // new PayloadCMS page. This preserves SEO and ensures old links work.
            if (yachtData?.uri) {
                // Store URI in const for type narrowing
                const uri = yachtData.uri;

                payload.logger.info(
                    `${LOG_PREFIX} Creating redirect from old CraftCMS URI: ${uri}`,
                );

                // First, remove any existing redirect for this URI to avoid conflicts
                yield* Effect.tryPromise({
                    try: async () =>
                        await payload.delete({
                            collection: 'redirects',
                            where: {
                                from: { equals: uri },
                            },
                        }),
                    catch: (cause) => {
                        payload.logger.warn(
                            `${LOG_PREFIX} Error deleting existing redirects for URI ${uri}: ${cause}`,
                        );
                        return new RedirectOperationError({
                            operation: 'delete',
                            uri,
                            cause,
                        });
                    },
                });

                // Create the redirect from old CraftCMS URI to the new page
                yield* Effect.tryPromise({
                    try: async () =>
                        await payload.create({
                            collection: 'redirects',
                            data: {
                                from: uri,
                                to: {
                                    type: 'reference',
                                    reference: {
                                        relationTo: 'pages',
                                        value: created.id,
                                    },
                                },
                                type: '308',
                            },
                        }),
                    catch: (cause) => {
                        payload.logger.error(
                            `${LOG_PREFIX} Error creating redirect from: ${uri} to page id: ${created.id} - ${cause}`,
                        );
                        return new RedirectOperationError({
                            operation: 'create',
                            uri,
                            pageId: created.id,
                            cause,
                        });
                    },
                });

                payload.logger.info(
                    `${LOG_PREFIX} Redirect created from: ${uri} to page id: ${created.id}`,
                );
            } else {
                payload.logger.info(
                    `${LOG_PREFIX} No CraftCMS URI found for yacht. Skipping redirect creation.`,
                );
            }

            // ─────────────────────────────────────────────────────────────────
            // Queue Cover Image Upload
            // ─────────────────────────────────────────────────────────────────
            // Enrich the fleet page with media from the original CraftCMS data.

            if (!yachtData) {
                payload.logger.info(
                    `${LOG_PREFIX} No yacht data found in JSONL for DVDB ID ${yacht.devoogt_id}. Skipping cover image.`,
                );
            } else {
                const galleryImages = [
                    ...(yachtData.gallery?.imagesExterior ?? []),
                    ...(yachtData.gallery?.imagesInterior ?? []),
                ];

                if (!galleryImages.length) {
                    payload.logger.info(
                        `${LOG_PREFIX} Yacht found in JSONL but has no gallery images. Skipping gallery.`,
                    );
                } else {
                    payload.logger.info(
                        `${LOG_PREFIX} Found yacht with ${galleryImages.length} gallery image(s).`,
                    );

                    const allGalleryImages = galleryImages.filter(
                        (asset) => asset?.kind === 'image' && !!asset?.filename,
                    );

                    if (allGalleryImages.length > 0) {
                        payload.logger.info(
                            `${LOG_PREFIX} Found ${allGalleryImages.length} image assets.`,
                        );
                    }

                    // ─────────────────────────────────────────────────────────────
                    // Gallery Image Upload Strategy
                    // ─────────────────────────────────────────────────────────────
                    // IMPORTANT: The order of operations here is critical to avoid
                    // race conditions and null entries in the gallery array.
                    //
                    // The createUploadFromUrl task updates documents by reading the
                    // current state, modifying a nested path, and writing back. If
                    // upload jobs are queued before the gallery structure exists in
                    // the database, the jobs will try to update array indices that
                    // don't exist yet, resulting in null entries.
                    //
                    // Correct order:
                    // 1. Create placeholder gallery items with unique IDs
                    // 2. Collect upload job configs (but don't queue yet)
                    // 3. Save the gallery structure to the page FIRST
                    // 4. THEN queue the async upload jobs
                    //
                    // This ensures each upload job can find and update its target
                    // gallery index because the array structure already exists.
                    // ─────────────────────────────────────────────────────────────

                    // Step 1: Pre-allocate gallery items with unique IDs
                    const gallery: NonNullable<
                        NonNullable<
                            NonNullable<Page['taxonomyData']>['fleet']
                        >['gallery']
                    >[number][] = allGalleryImages.map(() => ({
                        id: crypto.randomUUID(),
                    }));

                    // Step 2: Collect upload jobs (don't queue yet - page must be saved first)
                    const galleryUploadsQueue: Parameters<
                        typeof payload.jobs.queue<'createUploadFromUrl'>
                    >[] = [];

                    for (const [
                        index,
                        imageAsset,
                    ] of allGalleryImages.entries()) {
                        const filename = imageAsset.filename;
                        const imageUrl = yield* Effect.tryPromise({
                            try: async () =>
                                await resolveYachtImageUrl(filename),
                            catch: (cause) =>
                                new MediaOperationError({
                                    operation: 'resolve-url',
                                    filename,
                                    cause,
                                }),
                        });

                        if (!imageUrl) {
                            payload.logger.warn(
                                `${LOG_PREFIX} No accessible URL found for gallery image "${filename}". Tried multiple paths.`,
                            );
                            continue;
                        }

                        payload.logger.info(
                            `${LOG_PREFIX} Processing gallery image "${filename}" (resolved URL: ${imageUrl})`,
                        );

                        // Check if media already exists (deduplication)
                        const existingMedia = yield* Effect.tryPromise({
                            try: async () => {
                                const { docs } = await payload.find({
                                    collection: 'media',
                                    where: {
                                        source: { equals: imageUrl },
                                    },
                                    limit: 1,
                                });
                                return docs.at(0);
                            },
                            catch: (cause) =>
                                new MediaOperationError({
                                    operation: 'query',
                                    url: imageUrl,
                                    filename,
                                    cause,
                                }),
                        });

                        if (existingMedia) {
                            // Media exists - attach directly to gallery item (no async job needed)
                            payload.logger.info(
                                `${LOG_PREFIX} Media already exists for URL: ${imageUrl}. Attaching existing media (ID: ${existingMedia.id}) to gallery.`,
                            );

                            const currentGalleryItem = gallery[index];
                            currentGalleryItem.image = { media: existingMedia };
                        } else {
                            // Media doesn't exist - add to upload queue (will be queued AFTER page save)
                            const path = `taxonomyData.fleet.gallery.${index}.image.media`;
                            payload.logger.info(
                                `${LOG_PREFIX} Adding upload job for "${filename}" to queue (path: ${path})`,
                            );

                            galleryUploadsQueue.push([
                                {
                                    task: 'createUploadFromUrl',
                                    queue: 'media-sync',
                                    input: {
                                        url: imageUrl,
                                        target: {
                                            collection: 'pages',
                                            doc: created.id,
                                            path,
                                        },
                                    },
                                },
                            ]);
                        }
                    }

                    // Step 3: Save gallery structure to page BEFORE queueing upload jobs
                    // This ensures the gallery array indices exist when jobs run
                    yield* Effect.tryPromise({
                        try: async () =>
                            await payload.update({
                                collection: 'pages',
                                id: created.id,
                                data: {
                                    taxonomyData: {
                                        fleet: { gallery },
                                    },
                                },
                            }),
                        catch: (cause) =>
                            new PageOperationError({
                                operation: 'update',
                                pageId: created.id,
                                title,
                                dvdbReferenceId: String(yacht.devoogt_id),
                                cause,
                            }),
                    });

                    payload.logger.info(
                        `${LOG_PREFIX} Gallery structure saved with ${gallery.length} item(s). Now queueing ${galleryUploadsQueue.length} upload job(s).`,
                    );

                    // Step 4: NOW queue the upload jobs (gallery structure exists in DB)
                    for (const args of galleryUploadsQueue) {
                        yield* Effect.tryPromise({
                            try: async () => await payload.jobs.queue(...args),
                            catch: (cause) =>
                                new JobQueueError({
                                    task: 'createUploadFromUrl',
                                    queue: 'media-sync',
                                    input: args.at(0)?.input,
                                    cause,
                                }),
                        });
                        payload.logger.info(
                            `${LOG_PREFIX} Upload job queued for path: ${args.at(0)?.input?.target?.path}`,
                        );
                    }

                    // Find the first image asset to use as cover
                    const coverImage = Option.fromNullable(
                        allGalleryImages.at(0),
                    );

                    // Handle cover image upload...
                    if (Option.isNone(coverImage)) {
                        payload.logger.info(
                            `${LOG_PREFIX} No image assets with valid filename found. Skipping cover image.`,
                        );
                    } else {
                        const asset = coverImage.value;
                        const filename = asset.filename;

                        // Resolve the S3 URL by probing candidate paths
                        // Yacht images may be stored at different paths depending on volume
                        const imageUrl = yield* Effect.tryPromise({
                            try: async () =>
                                await resolveYachtImageUrl(filename),
                            catch: (cause) =>
                                new MediaOperationError({
                                    operation: 'resolve-url',
                                    filename,
                                    cause,
                                }),
                        });

                        if (!imageUrl) {
                            payload.logger.warn(
                                `${LOG_PREFIX} No accessible URL found for cover image "${filename}". Tried multiple paths.`,
                            );
                        } else {
                            payload.logger.info(
                                `${LOG_PREFIX} Queueing cover image upload for "${filename}" (resolved URL: ${imageUrl})`,
                            );

                            const existingMedia = yield* Effect.tryPromise({
                                try: async () => {
                                    const { docs } = await payload.find({
                                        collection: 'media',
                                        where: {
                                            source: { equals: imageUrl },
                                        },
                                        limit: 1,
                                    });
                                    return docs.at(0);
                                },
                                catch: (cause) =>
                                    new MediaOperationError({
                                        operation: 'query',
                                        url: imageUrl,
                                        filename,
                                        cause,
                                    }),
                            });

                            if (existingMedia) {
                                payload.logger.info(
                                    `${LOG_PREFIX} Media already exists for URL: ${imageUrl}. Attaching existing media (ID: ${existingMedia.id}) to page.`,
                                );

                                // Update the created page to link the existing media
                                yield* Effect.tryPromise({
                                    try: async () =>
                                        await payload.update({
                                            collection: 'pages',
                                            id: created.id,
                                            data: {
                                                taxonomyData: {
                                                    fleet: {
                                                        cover: {
                                                            media: existingMedia,
                                                        },
                                                    },
                                                },
                                                meta: {
                                                    image: existingMedia,
                                                },
                                            },
                                        }),
                                    catch: (cause) =>
                                        new PageOperationError({
                                            operation: 'update',
                                            pageId: created.id,
                                            title,
                                            dvdbReferenceId: String(
                                                yacht.devoogt_id,
                                            ),
                                            cause,
                                        }),
                                });
                            } else {
                                // Queue the media upload jobs to process the image asynchronously...

                                // Append media to cover image field
                                yield* Effect.tryPromise({
                                    try: async () =>
                                        await payload.jobs.queue({
                                            task: 'createUploadFromUrl',
                                            queue: 'media-sync',
                                            input: {
                                                url: imageUrl,
                                                target: {
                                                    collection: 'pages',
                                                    doc: created.id,
                                                    path: 'taxonomyData.fleet.cover.media',
                                                },
                                            },
                                        }),
                                    catch: (cause) =>
                                        new JobQueueError({
                                            task: 'createUploadFromUrl',
                                            queue: 'media-sync',
                                            input: { url: imageUrl },
                                            cause,
                                        }),
                                });

                                // Append media to meta image field
                                yield* Effect.tryPromise({
                                    try: async () =>
                                        await payload.jobs.queue({
                                            task: 'createUploadFromUrl',
                                            queue: 'media-sync',
                                            input: {
                                                url: imageUrl,
                                                target: {
                                                    collection: 'pages',
                                                    doc: created.id,
                                                    path: 'meta.image',
                                                },
                                            },
                                        }),
                                    catch: (cause) =>
                                        new JobQueueError({
                                            task: 'createUploadFromUrl',
                                            queue: 'media-sync',
                                            input: { url: imageUrl },
                                            cause,
                                        }),
                                });
                            }

                            payload.logger.info(
                                `${LOG_PREFIX} Cover image upload queued successfully (URL: ${imageUrl})`,
                            );
                        }
                    }
                }
            }

            payload.logger.info(
                `${LOG_PREFIX} Task completed successfully for yacht "${title}" (Page ID: ${created.id})`,
            );

            return {
                output: {
                    success: true,
                    pageId: created.id,
                },
            };
        });

        // Wrap the program in a catchTags to handle all expected error types and report to Sentry
        const safeProgram = unsafeProgram.pipe(
            Effect.catchTags({
                InputValidationError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'input_validation',
                            field: error.field,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Input validation failed: ${error.message}`,
                        },
                    });
                },
                DeVoogtAPIError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'devoogt_api',
                            dvdb_reference_id: error.dvdbReferenceId,
                            operation: error.operation,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `De Voogt DB API error for yacht ${error.dvdbReferenceId}: ${error.operation}`,
                        },
                    });
                },
                TemplateNotFoundError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'template_not_found',
                            template_title: error.templateTitle,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Page template not found: ${error.templateTitle}`,
                        },
                    });
                },
                ParentPageNotFoundError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'parent_page_not_found',
                            settings_path: error.settingsPath,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Parent page not found at ${error.settingsPath}`,
                        },
                    });
                },
                DatabaseQueryError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'database_query',
                            collection: error.collection,
                            operation: error.operation,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Database query failed: ${error.collection}.${error.operation}`,
                        },
                    });
                },
                PageOperationError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'page_operation',
                            operation: error.operation,
                            dvdb_reference_id: error.dvdbReferenceId,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Page ${error.operation} failed for yacht "${error.title}"`,
                        },
                    });
                },
                ContentConversionError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'content_conversion',
                            field: error.field,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Content conversion failed for field: ${error.field}`,
                        },
                    });
                },
                CraftCMSLookupError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'craftcms_lookup',
                            dvdb_reference_id: error.dvdbReferenceId,
                            source: error.source,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `CraftCMS data lookup failed for DVDB ID: ${error.dvdbReferenceId}`,
                        },
                    });
                },
                RedirectOperationError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'redirect_operation',
                            operation: error.operation,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Redirect ${error.operation} failed for URI: ${error.uri}`,
                        },
                    });
                },
                MediaOperationError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'media_operation',
                            operation: error.operation,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Media ${error.operation} failed${error.filename ? ` for file: ${error.filename}` : ''}`,
                        },
                    });
                },
                JobQueueError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'job_queue',
                            task: error.task,
                            queue: error.queue,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Failed to queue job: ${error.task} on queue ${error.queue}`,
                        },
                    });
                },
                SlugCollisionError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'slug_collision',
                            slug: error.slug,
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Slug collision: "${error.slug}" already exists (${error.duplicates} duplicate(s))`,
                        },
                    });
                },
                UnexpectedError: (error) => {
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_type: 'unexpected',
                        },
                        extra: {
                            ...error,
                            job: args.job,
                            input: args.input,
                        },
                    });
                    return Effect.succeed({
                        output: {
                            success: false,
                            error: `Unexpected error: ${error.message}`,
                        },
                    });
                },
            }),
        );

        return Effect.runPromise(safeProgram);
    },
};
