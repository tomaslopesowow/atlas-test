import { isoWeek } from '@repo/content-pipeline/pipeline/iso-week';
import { NextResponse } from 'next/server';
import type { Endpoint, PayloadRequest } from 'payload';
import { CONTENT_PIPELINE_QUEUE } from './run-job';

async function readJson(req: PayloadRequest): Promise<Record<string, unknown>> {
    try {
        return ((await req.json?.()) as Record<string, unknown>) ?? {};
    } catch {
        return {};
    }
}

/**
 * POST /api/content-pipeline/run — enqueue a pipeline run from the admin
 * "Run now" button. Admin-only: the button posts with the session cookie, so
 * `req.user` must be set. Scheduled runs go through the Payload Jobs scheduler
 * (see `contentPipelineJobsConfig`), not this endpoint, so there is no external
 * trigger secret to manage.
 *
 * Body: `{ source?: 'seed' | 'competitor', runWeek?: string }`.
 */
export const runContentPipelineEndpoint: Endpoint = {
    path: '/content-pipeline/run',
    method: 'post',
    handler: async (req) => {
        if (!req.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        const body = await readJson(req);
        const source = body.source === 'competitor' ? 'competitor' : 'seed';
        // Resolve the run week up front so the idempotency check and the run
        // itself agree on it (the workflow otherwise defaults to the current
        // ISO week). Passed explicitly into the job input below.
        const runWeek =
            typeof body.runWeek === 'string' && body.runWeek
                ? body.runWeek
                : isoWeek(new Date());

        // Idempotency: a run for this (source, runWeek) already produced topics
        // — re-running would re-research and double-draft. Skip the enqueue and
        // report the existing run instead.
        const existing = await req.payload.find({
            collection: 'content-pipeline-topics',
            where: {
                and: [
                    { source: { equals: source } },
                    { runWeek: { equals: runWeek } },
                ],
            },
            limit: 1,
            depth: 0,
        });

        if (existing.totalDocs > 0) {
            req.payload.logger.info(
                `Content pipeline: run for ${source} ${runWeek} already exists (${existing.totalDocs} topic(s)) — skipping duplicate enqueue.`,
            );
            return NextResponse.json(
                { queued: false, deduped: true, source, runWeek },
                { status: 200 },
            );
        }

        const job = await req.payload.jobs.queue({
            task: 'runContentPipeline',
            queue: CONTENT_PIPELINE_QUEUE,
            input: { source, runWeek },
        });

        // Process the queue without blocking the response.
        void req.payload.jobs
            .run({ queue: CONTENT_PIPELINE_QUEUE })
            .catch((error) => {
                req.payload.logger.error(
                    `Content pipeline job run failed: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
            });

        return NextResponse.json(
            { queued: true, jobId: job.id, source, runWeek },
            { status: 202 },
        );
    },
};

export const contentPipelineEndpoints: Endpoint[] = [
    runContentPipelineEndpoint,
];
