/**
 * @module syncYatcoResale
 *
 * This module provides the orchestrator task for synchronizing resale vessel data from
 * YATCO into PayloadCMS. It acts as the "Tier 1" task in the resale sync pipeline,
 * fetching all vessel records via paginated API calls and queuing individual page creation jobs.
 *
 * ## Architecture
 *
 * The resale synchronization follows a three-stage pipeline:
 *
 * ```
 * ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │ syncYatcoResale  │────▶│ createResalePage │────▶│createUploadFromUrl│
 * │  (Orchestrator)  │     │  (Page Creator)  │     │ (Media Handler)  │
 * └──────────────────┘     └──────────────────┘     └──────────────────┘
 *       nightly              taxonomy-sync            media-sync
 *        queue                   queue                  queue
 * ```
 *
 * 1. `syncYatcoResale` runs on the `nightly` queue
 * 2. Fetches all vessels from YATCO API (paginated)
 * 3. Sets delisted vessels (no longer in API) to draft status
 * 4. For each vessel, queues a `createResalePage` job (if not already queued)
 * 5. On success, reschedules itself for continuous operation
 *
 * ## Key Features
 *
 * - **Pagination Handling:** Fetches all vessels across multiple API pages
 * - **Delisting Cleanup:** Automatically unpublishes pages for vessels removed from YATCO
 * - **Job Deduplication:** Prevents duplicate sync jobs from running simultaneously
 * - **Per-Item Job Deduplication:** Skips queuing if a createResalePage job already exists
 * - **Self-Rescheduling:** Automatically queues next run on successful completion
 * - **Error Isolation:** Individual vessel processing errors don't stop the batch
 *
 * ## Data Source
 *
 * YATCO is a yacht listing platform. The API client is configured via environment
 * variables and accessed through `getYatcoClient`. The sync fetches all Feadship
 * vessels currently listed for resale.
 *
 * ## Usage
 *
 * This task is typically triggered by:
 * 1. Initial queue via admin panel or script
 * 2. Automatic rescheduling after successful completion
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'syncYatcoResale',
 *     queue: 'nightly',
 *     input: {},
 * });
 * ```
 */

import { Effect } from 'effect';
import type { TaskConfig } from 'payload';
import { getYatcoClient, type VesselSearchResult } from '../utils/yatco-client';
import * as Sentry from '@sentry/nextjs';

/**
 * PayloadCMS task configuration for resale vessel synchronization from YATCO.
 *
 * This orchestrator task:
 * 1. Checks for existing sync jobs (prevents concurrent runs)
 * 2. Fetches all vessel records from YATCO via paginated requests
 * 3. Queues individual `createResalePage` jobs for each vessel
 * 4. Reschedules itself on success
 *
 * ## Input Schema
 *
 * No inputs required - the task fetches all vessels from the API.
 *
 * ## Output
 *
 * Returns `{ success: true }` on completion.
 *
 * ## Pagination
 *
 * The YATCO API returns vessels in pages of 50 records. This task:
 * 1. Fetches pages sequentially until all vessels are retrieved
 * 2. Accumulates all vessels before processing
 * 3. Then queues jobs for each vessel
 *
 * ## Error Handling
 *
 * - Individual vessel processing errors are logged but don't stop the batch
 * - Errors are reported to Sentry via the `onFail` handler
 * - The task retries up to 3 times on failure
 *
 * @example
 * // Manually trigger resale sync
 * await payload.jobs.queue({
 *     task: 'syncYatcoResale',
 *     queue: 'nightly',
 *     input: {},
 * });
 */
export const syncYatcoResaleTask: TaskConfig = {
    slug: 'syncYatcoResale',

    // Retry up to 3 times on failure (API unavailability, network issues)
    retries: 3,

    // No inputs required for this orchestrator task
    inputSchema: [],

    /**
     * Error handler called when all retries are exhausted.
     * Reports the failure to Sentry for monitoring and alerting.
     */
    onFail: ({ job, input }) => {
        Sentry.captureException(new Error('Sync yatco resale task failed'), {
            extra: {
                job,
                input,
            },
        });
    },

    /**
     * Success handler that reschedules the sync job for continuous operation.
     *
     * This implements the "self-rescheduling" pattern where the task queues
     * another instance of itself after successful completion. This ensures
     * the resale data stays synchronized without manual intervention.
     *
     * The handler includes deduplication logic to prevent multiple sync jobs
     * from being queued simultaneously.
     */
    async onSuccess({ req: { payload }, job }) {
        payload.logger.info(
            'Sync yatco resale: Rescheduling syncYatcoResale job...',
        );

        // ─────────────────────────────────────────────────────────────────
        // Check for existing syncYatcoResale jobs (deduplication)
        // ─────────────────────────────────────────────────────────────────
        // Query the payload-jobs collection to see if another sync job
        // is already queued. We exclude the current job by ID to avoid
        // matching ourselves.
        const existingJob = await payload.find({
            collection: 'payload-jobs',
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'syncYatcoResale',
                        },
                    },
                    {
                        id: {
                            not_equals: job.id,
                        },
                    },
                ],
            },
        });

        // Skip rescheduling if another sync job is already queued
        if (existingJob.totalDocs > 0) {
            payload.logger.info(
                'Sync yatco resale: syncYatcoResale job is already queued. Skipping reschedule.',
            );
            return;
        }

        // Queue the next sync job on the nightly queue
        const nextJob = await payload.jobs.queue({
            task: 'syncYatcoResale',
            queue: 'nightly',
            input: {},
        });

        payload.logger.info(
            `Sync yatco resale: syncYatcoResale job added to queue "${nextJob.queue}".`,
        );
    },

    /**
     * Main task handler that orchestrates the resale vessel synchronization.
     *
     * The handler follows this flow:
     * 1. Check for concurrent sync jobs (skip if another is running)
     * 2. Initialize the YATCO API client
     * 3. Fetch all vessels via paginated API calls
     * 4. Set delisted vessels (no longer in API) to draft status
     * 5. For each vessel:
     *    a. Check if a createResalePage job already exists
     *    b. If not, queue a new createResalePage job
     * 6. Return success status
     *
     * Error handling uses the Effect library to isolate failures - if one vessel
     * fails to process, the others continue normally.
     */
    async handler({ req: { payload }, job }) {
        // ─────────────────────────────────────────────────────────────────
        // Deduplication Check
        // ─────────────────────────────────────────────────────────────────
        // Before processing, verify no other syncYatcoResale job is running.
        // This prevents race conditions and duplicate processing.
        const existingJob = await payload.find({
            collection: 'payload-jobs',
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'syncYatcoResale',
                        },
                    },
                    {
                        id: {
                            not_equals: job.id,
                        },
                    },
                ],
            },
        });

        if (existingJob.totalDocs > 0) {
            payload.logger.info(
                'Sync yatco resale: syncYatcoResale job is already queued. Skipping.',
            );
            return {
                output: {
                    success: true,
                },
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // Initialize API Client
        // ─────────────────────────────────────────────────────────────────
        const yatcoClient = await getYatcoClient(payload);

        // Pagination state
        let hasNextPage = true;
        let offset = 0;
        const records = 50; // Page size for YATCO API
        const allVessels: VesselSearchResult[] = [];

        // ─────────────────────────────────────────────────────────────────
        // Paginated Data Fetching
        // ─────────────────────────────────────────────────────────────────
        // YATCO API returns vessels in pages. We iterate through all pages
        // and accumulate vessels before processing to ensure we have the
        // complete dataset.
        do {
            const resaleVessels = await yatcoClient?.ForSale.Vessel.Search({
                offset,
                records,
            });

            payload.logger.info(
                'Sync yatco resale: Fetching Yatco resale vessels...',
            );
            payload.logger.info({
                message: 'Sync yatco resale: Fetched vessels page info',
                Count: resaleVessels?.Count,
                Offset: resaleVessels?.Offset,
                Records: resaleVessels?.Records,
                Results: resaleVessels?.Results.length,
            });

            // Defensive check: ensure API returns a valid count for pagination
            if (!resaleVessels?.Count) {
                throw new Error(
                    'Sync yatco resale: Got invalid pagination response from Yatco',
                );
            }

            // Check if there are more pages to fetch
            // If total count > current offset + page size, there are more pages
            hasNextPage = resaleVessels.Count > offset + records;
            offset += records;

            // Accumulate vessels for processing
            // Only include vessels that are listed or have not been sold.
            // Filtering here because the Yatco API Search apparently does not support
            // its own status filtering.
            allVessels.push(
                ...resaleVessels.Results.filter(
                    (vessel) => vessel.VesselStatus === 1 || !vessel.SoldDate,
                ),
            );
        } while (hasNextPage);

        payload.logger.info(
            `Sync yatco resale: Total vessels accumulated: ${allVessels.length}`,
        );

        // ─────────────────────────────────────────────────────────────────
        // Cleanup Delisted Vessels
        // ─────────────────────────────────────────────────────────────────
        // Set any published resale pages to draft status if their YATCO
        // vessel no longer exists in the API results. This ensures that
        // vessels removed from YATCO listings are automatically unpublished.
        const delistedResult = await payload.update({
            collection: 'pages',
            where: {
                and: [
                    {
                        taxonomyType: {
                            equals: 'resale',
                        },
                    },
                    {
                        _status: {
                            equals: 'published',
                        },
                    },
                    {
                        'taxonomyData.resale.yatcoVesselId': {
                            not_in: allVessels.map((v) => String(v.VesselID)),
                        },
                    },
                ],
            },
            data: {
                _status: 'draft',
            },
        });

        if (delistedResult.docs.length > 0) {
            payload.logger.info(
                `Sync yatco resale: Set ${delistedResult.docs.length} delisted vessel(s) to draft`,
            );
            for (const page of delistedResult.docs) {
                payload.logger.info(
                    `Sync yatco resale: Delisted vessel ID ${page.taxonomyData?.resale?.yatcoVesselId} (page: ${page.id})`,
                );
            }
        } else {
            payload.logger.info('Sync yatco resale: No delisted vessels found');
        }

        // ─────────────────────────────────────────────────────────────────
        // Queue Individual Page Creation Jobs
        // ─────────────────────────────────────────────────────────────────
        // Process each vessel using Effect.all for sequential processing with
        // error isolation. Each vessel is wrapped in Effect.tryPromise to
        // catch and handle errors without stopping the entire batch.
        await Effect.all(
            allVessels.map((vessel) =>
                Effect.tryPromise(async () => {
                    // Validate vessel has an ID
                    if (!vessel.VesselID) {
                        throw new Error(
                            'Sync yatco resale: Vessel ID is required',
                        );
                    }

                    // ─────────────────────────────────────────────────────
                    // Per-Vessel Job Deduplication
                    // ─────────────────────────────────────────────────────
                    // Check if a createResalePage job already exists for this
                    // vessel ID. This prevents queueing duplicate jobs.
                    const existingJob = await payload.find({
                        collection: 'payload-jobs',
                        where: {
                            and: [
                                {
                                    taskSlug: {
                                        equals: 'createResalePage',
                                    },
                                },
                                {
                                    'input.yatcoVesselId': {
                                        equals: String(vessel.VesselID),
                                    },
                                },
                            ],
                        },
                    });

                    if (existingJob.totalDocs > 0) {
                        payload.logger.info(
                            `Sync yatco resale: Job for vessel with ID ${vessel.VesselID} already exists. Skipping creation.`,
                        );
                        return;
                    }

                    // ─────────────────────────────────────────────────────
                    // Queue Page Creation Job
                    // ─────────────────────────────────────────────────────
                    // Enqueue a new job to create or update the resale page
                    // for this vessel. The job runs on the taxonomy-sync queue.
                    payload.jobs.queue({
                        task: 'createResalePage',
                        queue: 'taxonomy-sync',
                        input: {
                            yatcoVesselId: String(vessel.VesselID),
                        },
                    });
                }).pipe(
                    // ─────────────────────────────────────────────────────
                    // Error Isolation
                    // ─────────────────────────────────────────────────────
                    // Catch any errors for this vessel and log them, but
                    // continue processing other vessels. This ensures one
                    // problematic vessel doesn't stop the entire sync.
                    Effect.catchAll((error) => {
                        payload.logger.error(
                            `Sync yatco resale: ${String(error)}`,
                        );
                        payload.logger.info({
                            message: 'Sync yatco resale: Vessel context',
                            vessel,
                        });
                        payload.logger.error(
                            `Sync yatco resale: Error processing vessel with ID ${vessel.VesselID}`,
                        );
                        // Return Effect.succeedNone to continue with other vessels
                        return Effect.succeedNone;
                    }),
                ),
            ),
        ).pipe(Effect.runPromise);

        return {
            output: {
                success: true,
            },
        };
    },
};
