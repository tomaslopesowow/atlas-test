/**
 * @module createUploadFromUrl
 *
 * This module provides a PayloadCMS background task for downloading media from external URLs
 * and creating media documents in PayloadCMS. It serves as the foundational media handling
 * layer for all data migration and synchronization tasks.
 *
 * ## Purpose
 *
 * When syncing data from external sources (YATCO, De Voogt DB, CraftCMS), media files
 * (images, documents) need to be:
 * 1. Downloaded from their original URLs
 * 2. Stored in PayloadCMS's media collection
 * 3. Linked to the appropriate target documents (pages, blocks, etc.)
 *
 * This task handles all three steps, with built-in deduplication to avoid re-downloading
 * media that already exists.
 *
 * ## Key Features
 *
 * - **Source Deduplication:** Checks if media with the same source URL already exists
 * - **Nested Path Updates:** Can update deeply nested document fields (e.g., `blocks.0.items.1.media`)
 * - **Error Resilience:** Graceful handling of fetch failures and missing targets
 * - **Effect-based Flow:** Uses Effect library for composable async operations
 *
 * ## Usage
 *
 * Queue this task from other tasks when media needs to be downloaded:
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'createUploadFromUrl',
 *     queue: 'media-sync',
 *     input: {
 *         url: 'https://example.com/image.jpg',
 *         target: {
 *             collection: 'pages',
 *             doc: 'page-id',
 *             path: 'taxonomyData.news.cover.media',
 *         },
 *     },
 * });
 * ```
 *
 * ## Queue
 *
 * Runs on the `media-sync` queue to isolate media processing from page creation tasks.
 */

import type { Media } from '@/payload-types';
import * as Sentry from '@sentry/nextjs';
import { Effect, Option } from 'effect';
import type { CollectionSlug, TaskConfig } from 'payload';

/**
 * Log prefix for consistent log message identification.
 * All log messages from this task are prefixed with this string for easy filtering.
 */
const CREATE_UPLOAD_LOG_PREFIX = '[createUploadFromUrlTask]';

/**
 * PayloadCMS task configuration for downloading media from URLs and attaching to documents.
 *
 * This task performs the following operations:
 * 1. Validates the provided URL
 * 2. Checks for existing media with the same source URL (deduplication)
 * 3. If no existing media, downloads the file and creates a new media document
 * 4. If a target is specified, updates the target document at the given path
 *
 * ## Input Schema
 *
 * - `url` (required): The URL to download media from
 * - `extra` (optional): Additional JSON data to store with the media
 * - `target` (optional): Where to attach the media after creation
 *   - `collection`: The PayloadCMS collection containing the target document
 *   - `doc`: The ID of the target document
 *   - `path`: Dot-notation path to the field that should hold the media reference
 *
 * ## Path Format
 *
 * The `target.path` supports dot notation for nested fields and array indices:
 * - `cover.media` - Simple nested field
 * - `blocks.0.media` - Array index access
 * - `blocks.0.items.1.media.image.media` - Deeply nested with multiple arrays
 *
 * ## Output
 *
 * Returns `{ media }` where media is the created or existing media document,
 * or `{ media: null }` if the operation failed.
 *
 * @example
 * // Queue a media upload for a page cover image
 * await payload.jobs.queue({
 *     task: 'createUploadFromUrl',
 *     queue: 'media-sync',
 *     input: {
 *         url: 'https://yatco.com/images/vessel-123.jpg',
 *         target: {
 *             collection: 'pages',
 *             doc: 'abc123',
 *             path: 'taxonomyData.resale.cover.media',
 *         },
 *     },
 * });
 *
 * @example
 * // Queue a media upload for an image within a content block
 * await payload.jobs.queue({
 *     task: 'createUploadFromUrl',
 *     queue: 'media-sync',
 *     input: {
 *         url: 'https://s3.amazonaws.com/craft/media/images/article-photo.jpg',
 *         target: {
 *             collection: 'pages',
 *             doc: 'xyz789',
 *             path: 'blocks.2.media.image.media',
 *         },
 *     },
 * });
 */
export const createUploadFromUrlTask: TaskConfig<'createUploadFromUrl'> = {
    slug: 'createUploadFromUrl',

    // Retry up to 3 times on failure (network issues, temporary unavailability)
    retries: 3,

    /**
     * Error handler called when all retries are exhausted.
     * Reports the failure to Sentry for monitoring and alerting.
     */
    onFail: ({ job, input }) => {
        Sentry.captureException(
            new Error('Create upload from URL task failed'),
            {
                extra: {
                    job,
                    input,
                },
            },
        );
    },

    /**
     * Input schema defining the expected task inputs.
     * PayloadCMS validates inputs against this schema before running the handler.
     */
    inputSchema: [
        {
            name: 'url',
            type: 'text',
            required: true,
        },
        {
            name: 'extra',
            type: 'json',
        },
        {
            name: 'target',
            type: 'group',
            fields: [
                {
                    name: 'collection',
                    type: 'text',
                },
                {
                    name: 'doc',
                    type: 'text',
                },
                {
                    name: 'path',
                    type: 'text',
                },
            ],
        },
    ],

    /**
     * Main task handler using Effect for composable async operations.
     *
     * The handler follows this flow:
     * 1. Parse and validate the input URL
     * 2. Check for existing media with the same source URL
     * 3. If no existing media:
     *    a. Fetch the file from the URL
     *    b. Convert response to Buffer
     *    c. Create media document with file data
     * 4. If target is specified:
     *    a. Fetch the target document
     *    b. Build update payload for the nested path
     *    c. Update the target document
     * 5. Return the media document
     */
    handler: ({ input, req }) =>
        Effect.gen(function* () {
            req.payload.logger.info(
                `${CREATE_UPLOAD_LOG_PREFIX} Handler started for url: ${input.url}`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Step 1: Validate URL
            // ─────────────────────────────────────────────────────────────────
            // Parse the URL to ensure it's valid. This also normalizes the URL
            // for consistent deduplication checks.
            const url = yield* Effect.try(() => {
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} Validating provided URL: ${input.url}`,
                );
                return new URL(input.url);
            });

            // ─────────────────────────────────────────────────────────────────
            // Step 2: Check for existing media (deduplication)
            // ─────────────────────────────────────────────────────────────────
            // Look up existing media by source URL to avoid re-downloading.
            // The `source` field on media documents stores the original URL.
            req.payload.logger.info(
                `${CREATE_UPLOAD_LOG_PREFIX} Checking for existing media by source: ${url.href}`,
            );
            let media: Media | null | undefined = yield* Effect.promise(() =>
                req.payload
                    .find({
                        collection: 'media',
                        where: {
                            source: { equals: url.href },
                        },
                        limit: 1,
                    })
                    .then((res) => res.docs[0]),
            );

            if (media) {
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} Media for URL "${url.href}" already exists with ID: ${media.id}. Skipping creation.`,
                );
            }

            // ─────────────────────────────────────────────────────────────────
            // Step 3: Download and create media if it doesn't exist
            // ─────────────────────────────────────────────────────────────────
            if (!media) {
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} No existing media found. Will fetch and upload new media from: ${url.href}`,
                );

                // 3a. Fetch the file from the remote URL
                const sourceBlob = yield* Effect.tryPromise({
                    try: async () => {
                        req.payload.logger.info(
                            `${CREATE_UPLOAD_LOG_PREFIX} Fetching data from: ${url.href}`,
                        );
                        const response = await fetch(url).catch((error) => {
                            req.payload.logger.error(
                                error,
                                `${CREATE_UPLOAD_LOG_PREFIX} Failed to fetch URL: ${url.href}`,
                            );
                            return null;
                        });

                        if (!response) {
                            return null;
                        }

                        // Check for HTTP errors (4xx, 5xx)
                        if (!response.ok) {
                            const { status, statusText } = response;
                            req.payload.logger.error(
                                { status, statusText },
                                `${CREATE_UPLOAD_LOG_PREFIX} Fetch failed: ${response.status} ${response.statusText}`,
                            );
                            return null;
                        }

                        req.payload.logger.info(
                            `${CREATE_UPLOAD_LOG_PREFIX} Fetch succeeded.`,
                        );

                        return response.blob();
                    },
                    catch: (error) => {
                        req.payload.logger.error(
                            error,
                            `${CREATE_UPLOAD_LOG_PREFIX} Failed to fetch URL: ${url.href}`,
                        );
                        return null;
                    },
                });

                // Exit early if fetch failed
                if (!sourceBlob) {
                    req.payload.logger.error(
                        `${CREATE_UPLOAD_LOG_PREFIX} No source blob found.`,
                    );
                    return { output: { media: null } };
                }

                // 3b. Convert Blob to Buffer for PayloadCMS file upload
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} Converting fetched data to Buffer.`,
                );
                const sourceBuffer = yield* Effect.tryPromise({
                    try: () =>
                        sourceBlob
                            .arrayBuffer()
                            .then((buf) => Buffer.from(buf)),
                    catch: (error) => {
                        req.payload.logger.error(
                            error,
                            `${CREATE_UPLOAD_LOG_PREFIX} Failed to read fetched data`,
                        );
                        return null;
                    },
                });

                if (!sourceBuffer) {
                    req.payload.logger.error(
                        `${CREATE_UPLOAD_LOG_PREFIX} No source buffer found.`,
                    );
                    return { output: { media: null } };
                }

                // 3c. Create media document with the downloaded file
                // Use a random UUID as filename to avoid conflicts
                const fileName = decodeURIComponent(crypto.randomUUID());
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} Creating new media upload, filename: ${fileName}`,
                );

                media = yield* Effect.tryPromise(() =>
                    req.payload.create({
                        collection: 'media',
                        data: {
                            // Store original URL for deduplication and reference
                            source: url.href,
                            // Store any additional metadata passed by the caller
                            extra: input.extra,
                        },
                        file: {
                            data: sourceBuffer,
                            name: fileName,
                            mimetype: sourceBlob.type,
                            size: sourceBlob.size,
                        },
                    }),
                ).pipe(
                    Effect.catchAll((error) => {
                        req.payload.logger.error(
                            error,
                            `${CREATE_UPLOAD_LOG_PREFIX} Failed to create media upload for: ${url.href}`,
                        );
                        return Effect.succeed(null);
                    }),
                );

                if (!media) {
                    req.payload.logger.error(
                        `${CREATE_UPLOAD_LOG_PREFIX} No media created.`,
                    );
                    return { output: { media: null } };
                }

                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} Successfully created media upload from URL: ${url.href}, id: ${media.id}`,
                );
            }

            // ─────────────────────────────────────────────────────────────────
            // Step 4: Update target document if specified
            // ─────────────────────────────────────────────────────────────────
            // If no target is specified, we're done - just return the media
            if (
                !input.target ||
                !input.target.collection ||
                !input.target.doc ||
                !input.target.path
            ) {
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} No target specified. Upload step complete.`,
                );
                return { output: { media } };
            }

            req.payload.logger.info(
                `${CREATE_UPLOAD_LOG_PREFIX} Preparing to assign media (id: ${media.id}) to target doc (${input.target.collection}:${input.target.doc}) at path "${input.target.path}".`,
            );

            // 4a. Fetch the target document to get its current state
            // We need the current state to properly merge the update
            const targetDoc = yield* Effect.promise(() =>
                req.payload
                    .find({
                        // biome-ignore lint/style/noNonNullAssertion: validated above
                        collection: input.target!.collection as CollectionSlug,
                        where: {
                            // biome-ignore lint/style/noNonNullAssertion: validated above
                            id: { equals: input.target!.doc },
                        },
                        limit: 1,
                        depth: 0, // Don't populate relations, we just need the raw data
                    })
                    .then(
                        (res) =>
                            res.docs[0] as unknown as Record<string, unknown>,
                    ),
            );

            if (!targetDoc) {
                req.payload.logger.error(
                    `${CREATE_UPLOAD_LOG_PREFIX} Target document not found: ${input.target.collection}, id: ${input.target.doc}`,
                );
                return { output: { media } };
            }

            // 4b. Build the update payload by traversing the path
            // ─────────────────────────────────────────────────────────────────
            // The path is dot-notation (e.g., "blocks.0.items.1.media.image.media")
            // We need to construct a nested object that preserves existing data
            // while setting the media ID at the correct location.
            //
            // For example, with path "blocks.0.media.image.media":
            // - segments = ["blocks", "0", "media", "image", "media"]
            // - We start with updateData = { blocks: targetDoc.blocks }
            // - Then traverse: blocks → blocks[0] → blocks[0].media → blocks[0].media.image
            // - Finally set: blocks[0].media.image.media = mediaId
            // ─────────────────────────────────────────────────────────────────
            req.payload.logger.info(
                `${CREATE_UPLOAD_LOG_PREFIX} Target doc found, constructing update payload for path: ${input.target.path}`,
            );

            // Split path into segments: ["blocks", "0", "items", "1", "media", "image", "media"]
            const segments = input.target.path.split('.');

            // Initialize update data with the first segment from the target document
            // This ensures we don't lose existing data in that top-level field
            const updateData: Record<string, unknown> = {
                [segments[0]]: targetDoc[segments[0]],
            };

            // Traverse the path, creating nested objects/arrays as needed
            let currentUpdateData: Record<string, unknown> = updateData;

            segments.forEach((segment, index, array) => {
                if (index === array.length - 1) {
                    // Last segment: set the media ID
                    req.payload.logger.info(
                        `${CREATE_UPLOAD_LOG_PREFIX} Setting media id (${media.id}) at segment: ${segment}`,
                    );
                    currentUpdateData[segment] = media.id;
                } else {
                    // Intermediate segment: create object or array if needed
                    // Look ahead to determine if next segment is an array index
                    const nextSegment = segments[index + 1];
                    const nextSegmentIsArray = !Number.isNaN(
                        Number(nextSegment),
                    );

                    // Initialize as array if next segment is numeric, otherwise object
                    currentUpdateData[segment] ??= nextSegmentIsArray ? [] : {};

                    // Move pointer to the nested object/array
                    currentUpdateData = currentUpdateData[segment] as Record<
                        string,
                        unknown
                    >;
                }
            });

            // 4c. Update the target document
            req.payload.logger.info(
                `${CREATE_UPLOAD_LOG_PREFIX} Sending update to target doc (${input.target.collection}:${input.target.doc})`,
            );

            const updateResult = yield* Effect.tryPromise(() =>
                req.payload.update({
                    // biome-ignore lint/style/noNonNullAssertion: validated above
                    collection: input.target!.collection! as CollectionSlug,
                    // biome-ignore lint/style/noNonNullAssertion: validated above
                    id: input.target!.doc!,
                    data: updateData,
                }),
            ).pipe(
                Effect.tapError((error) => {
                    req.payload.logger.error(
                        { error, updateData, target: targetDoc },
                        `${CREATE_UPLOAD_LOG_PREFIX} Update failed for target doc (${input.target?.collection}:${input.target?.doc})`,
                    );
                    return Effect.succeedNone;
                }),
                Effect.option,
            );

            if (Option.isSome(updateResult)) {
                req.payload.logger.info(
                    `${CREATE_UPLOAD_LOG_PREFIX} Target update completed for doc (${input.target.collection}:${input.target.doc}) and path: ${input.target.path}`,
                );
            } else {
                req.payload.logger.error(
                    `${CREATE_UPLOAD_LOG_PREFIX} Target update failed for doc (${input.target.collection}:${input.target.doc}) and path: ${input.target.path}`,
                );
            }

            req.payload.logger.info(
                `${CREATE_UPLOAD_LOG_PREFIX} Handler complete. Returning media id: ${media.id}`,
            );
            return { output: { media } };
        }).pipe(
            // Global error handler for any unhandled errors in the Effect chain
            Effect.catchAll((error) => {
                const message = `${CREATE_UPLOAD_LOG_PREFIX} Failed to create upload from URL: ${error}`;
                req.payload.logger.error(message);
                return Effect.fail(new Error(message));
            }),
            Effect.runPromise,
        ),
};
