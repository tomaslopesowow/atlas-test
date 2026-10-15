/**
 * @module syncFleet
 *
 * This module provides the orchestrator task for synchronizing fleet yacht data from
 * De Voogt DB (DVDB) into PayloadCMS. It acts as the "Tier 1" task in the sync pipeline,
 * fetching all yacht records and queuing individual page creation jobs.
 *
 * ## Architecture
 *
 * The fleet synchronization follows a two-stage pipeline:
 *
 * ```
 * ┌─────────────────┐     ┌─────────────────┐
 * │   syncFleet     │────▶│ createFleetPage │
 * │  (Orchestrator) │     │ (Page Creator)  │
 * └─────────────────┘     └─────────────────┘
 *      nightly             taxonomy-sync
 *       queue                  queue
 * ```
 *
 * 1. `syncFleet` runs on the `nightly` queue
 * 2. Fetches all yachts from De Voogt DB API
 * 3. For each yacht, queues a `createFleetPage` job (if not already queued)
 * 4. On success, reschedules itself for continuous operation
 *
 * ## Key Features
 *
 * - **Job Deduplication:** Prevents duplicate sync jobs from running simultaneously
 * - **Per-Item Job Deduplication:** Skips queuing if a createFleetPage job already exists
 * - **Self-Rescheduling:** Automatically queues next run on successful completion
 * - **Error Isolation:** Individual yacht processing errors don't stop the batch
 *
 * ## Data Source
 *
 * De Voogt DB is the internal database containing the Feadship fleet information.
 * The API client is configured via environment variables and accessed through `getDVDBClient`.
 *
 * ## Usage
 *
 * This task is typically triggered by:
 * 1. Initial queue via admin panel or script
 * 2. Automatic rescheduling after successful completion
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'syncFleet',
 *     queue: 'nightly',
 *     input: {},
 * });
 * ```
 */

import { Effect } from 'effect';
import type { TaskConfig } from 'payload';
import * as Sentry from '@sentry/nextjs';
import { getDVDBClient, type Yacht } from '../utils/devoogtdb-client';
import { formatSlug } from '@/features/payload/fields/slug/formatSlug';

/**
 * PayloadCMS task configuration for fleet synchronization from De Voogt DB.
 *
 * This orchestrator task:
 * 1. Checks for existing sync jobs (prevents concurrent runs)
 * 2. Fetches all yacht records from De Voogt DB
 * 3. Queues individual `createFleetPage` jobs for each yacht
 * 4. Reschedules itself on success
 *
 * ## Input Schema
 *
 * No inputs required - the task fetches all yachts from the API.
 *
 * ## Output
 *
 * Returns `{ success: true }` on completion.
 *
 * ## Error Handling
 *
 * - Individual yacht processing errors are logged but don't stop the batch
 * - Errors are reported to Sentry via the `onFail` handler (inherited from PayloadCMS)
 * - The task retries up to 3 times on failure
 *
 * @example
 * // Manually trigger fleet sync
 * await payload.jobs.queue({
 *     task: 'syncFleet',
 *     queue: 'nightly',
 *     input: {},
 * });
 */
export const syncFleetTask: TaskConfig<'syncFleet'> = {
    slug: 'syncFleet',

    // Retry up to 3 times on failure (API unavailability, network issues)
    retries: 3,

    // No inputs required for this orchestrator task
    inputSchema: [],

    /**
     * Success handler that reschedules the sync job for continuous operation.
     *
     * This implements the "self-rescheduling" pattern where the task queues
     * another instance of itself after successful completion. This ensures
     * the fleet data stays synchronized without manual intervention.
     *
     * The handler includes deduplication logic to prevent multiple sync jobs
     * from being queued simultaneously.
     */
    async onSuccess({ req: { payload }, job }) {
        payload.logger.info('Sync fleet (dvdb): Rescheduling syncFleet job...');

        // ─────────────────────────────────────────────────────────────────
        // Check for existing syncFleet jobs (deduplication)
        // ─────────────────────────────────────────────────────────────────
        // Query the payload-jobs collection to see if another syncFleet job
        // is already queued. We exclude the current job by ID to avoid
        // matching ourselves.
        const existingJob = await payload.find({
            collection: 'payload-jobs',
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'syncFleet',
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
                'Sync fleet (dvdb): syncFleet job is already queued. Skipping reschedule.',
            );
            return;
        }

        // Queue the next sync job on the nightly queue
        const nextJob = await payload.jobs.queue({
            task: 'syncFleet',
            queue: 'nightly',
            input: {},
        });

        payload.logger.info(
            `Sync fleet (dvdb): syncFleet job added to queue "${nextJob.queue}".`,
        );
    },

    /**
     * Main task handler that orchestrates the fleet synchronization.
     *
     * The handler follows this flow:
     * 1. Check for concurrent sync jobs (skip if another is running)
     * 2. Initialize the De Voogt DB API client
     * 3. Fetch all yacht records from the API
     * 4. For each yacht:
     *    a. Check if a createFleetPage job already exists
     *    b. If not, queue a new createFleetPage job
     * 5. Return success status
     *
     * Error handling uses the Effect library to isolate failures - if one yacht
     * fails to process, the others continue normally.
     */
    async handler({ req: { payload }, job }) {
        // ─────────────────────────────────────────────────────────────────
        // Deduplication Check
        // ─────────────────────────────────────────────────────────────────
        // Before processing, verify no other syncFleet job is running.
        // This prevents race conditions and duplicate processing.
        const existingJob = await payload.find({
            collection: 'payload-jobs',
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'syncFleet',
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
                'Sync fleet (dvdb): syncFleet job is already queued. Skipping reschedule.',
            );
            return {
                output: {
                    success: true,
                },
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // Load Yacht Data from DVDB API
        // ─────────────────────────────────────────────────────────────────
        // Fetch all yachts directly from the De Voogt DB API and filter
        // to only those marked for display on the Feadship website.
        const dvdbClient = await getDVDBClient(payload);
        const allYachts = await dvdbClient.FleetData.all();

        // Validate that we received yacht data
        if (!allYachts || allYachts.length === 0) {
            const message =
                'Sync fleet (dvdb): No yachts returned from DVDB API';
            payload.logger.error(message);
            throw new Error(message);
        }

        // Filter to only yachts that should appear on the website,
        // and sort by year (oldest to newest) for consistent processing order.
        const yachts = allYachts
            .filter((yacht) => yacht.feadship_website === true)
            .toSorted(
                (a, b) => Number(a.year ?? null) - Number(b.year ?? null),
            );

        // Group yachts by slug for slug deduplication in the createFleetPage task.
        const yachtsBySlug = new Map<string, Yacht[]>();

        for (const yacht of yachts) {
            const name =
                yacht.launch_name ||
                String(yacht.hull ?? `Unknown - DVDB ID ${yacht.devoogt_id}`);
            const slug = formatSlug(name);
            if (!yachtsBySlug.has(slug)) yachtsBySlug.set(slug, []);
            yachtsBySlug.get(slug)?.push(yacht);
        }

        payload.logger.info({
            message: 'Sync fleet (dvdb): Yachts loaded from DVDB API',
            total: allYachts.length,
            filtered: yachts.length,
        });

        // ─────────────────────────────────────────────────────────────────
        // Resolve Unique Slugs
        // ─────────────────────────────────────────────────────────────────
        // Collect all assigned slugs to prevent cross-group collisions.
        // E.g. yacht "Foo" and "Foo 1" would both produce "foo-1" with
        // naive index-based suffixing; this loop increments until unique.
        const assignedSlugs = new Set<string>();
        const yachtEntries = new Map<string, Yacht[]>();

        for (const [baseSlug, group] of yachtsBySlug.entries()) {
            for (const yacht of group) {
                let candidateSlug = baseSlug;

                // Increment until unique across ALL groups
                let suffix = 2;
                while (assignedSlugs.has(candidateSlug)) {
                    candidateSlug = `${baseSlug}-${suffix}`;
                    suffix++;
                }

                assignedSlugs.add(candidateSlug);
                if (!yachtEntries.has(candidateSlug)) {
                    yachtEntries.set(candidateSlug, []);
                }
                yachtEntries.get(candidateSlug)?.push(yacht);
            }
        }

        Sentry.captureMessage('Sync fleet (dvdb): Resolved slug mapping', {
            level: 'info',
            extra: {
                slugMapping: Object.fromEntries(
                    yachtEntries.entries().map(([slug, yachts]) => [
                        slug,
                        yachts.map((y) => ({
                            devoogt_id: y.devoogt_id,
                            launch_name: y.launch_name,
                        })),
                    ]),
                ),
            },
        });

        // ─────────────────────────────────────────────────────────────────
        // Queue Individual Page Creation Jobs
        // ─────────────────────────────────────────────────────────────────
        // Process each yacht using Effect.all for sequential processing with
        // error isolation. Each yacht is wrapped in Effect.tryPromise to
        // catch and handle errors without stopping the entire batch.
        await Effect.all(
            yachtEntries
                .entries()
                .flatMap(([slug, yachts]) =>
                    yachts.map((yacht) => ({ slug, yacht })),
                )
                .map(({ slug, yacht }) =>
                    Effect.tryPromise(async () => {
                        const dvdbId = yacht.devoogt_id;

                        // ─────────────────────────────────────────────────────
                        // Per-Yacht Job Deduplication
                        // ─────────────────────────────────────────────────────
                        // Check if a createFleetPage job already exists for this
                        // yacht's De Voogt ID. This prevents queueing duplicate
                        // jobs for the same yacht.
                        const existingJob = await payload.find({
                            collection: 'payload-jobs',
                            where: {
                                and: [
                                    {
                                        taskSlug: {
                                            equals: 'createFleetPage',
                                        },
                                    },
                                    {
                                        'input.dvdbReferenceId': {
                                            equals: String(dvdbId),
                                        },
                                    },
                                ],
                            },
                        });

                        if (existingJob.totalDocs > 0) {
                            payload.logger.info(
                                `Sync fleet (dvdb): Job for yacht with ID ${dvdbId} already exists. Skipping creation.`,
                            );
                            return;
                        }

                        // ─────────────────────────────────────────────────────
                        // Queue Page Creation Job
                        // ─────────────────────────────────────────────────────
                        // Enqueue a new job to create or update the fleet page
                        // for this yacht. The job runs on the taxonomy-sync queue.
                        payload.jobs.queue({
                            task: 'createFleetPage',
                            queue: 'taxonomy-sync',
                            input: {
                                slug,
                                dvdbReferenceId: String(dvdbId),
                            },
                        });
                    }).pipe(
                        // ─────────────────────────────────────────────────────
                        // Error Isolation
                        // ─────────────────────────────────────────────────────
                        // Catch any errors for this yacht and log them, but
                        // continue processing other yachts. This ensures one
                        // problematic yacht doesn't stop the entire sync.
                        Effect.catchAll((error) => {
                            payload.logger.error(
                                `Sync fleet (dvdb): ${String(error)}`,
                            );
                            payload.logger.info({
                                message: 'Sync fleet (dvdb): Yacht context',
                                yacht,
                            });
                            payload.logger.error(
                                `Sync fleet (dvdb): Error processing yacht with devoogt_id ${yacht.devoogt_id}`,
                            );
                            // Return Effect.succeedNone to continue with other yachts
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
