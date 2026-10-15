import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { Config, PayloadRequest, TaskConfig } from 'payload';
import type { PipelineRunResult } from '../mastra/run';
import { getContentPipelineRuntime } from '../plugin';
import { loadPipelineSettings } from './load-settings';

type RunPipelineInput = {
    source?: string;
    runWeek?: string;
};

type CompletedRun = Extract<PipelineRunResult, { status: 'completed' }>;

/**
 * Emails the configured recipients a digest of the draft posts a run just
 * created, so the team knows there are drafts to review and publish. Only fires
 * when the run produced ≥1 draft and at least one recipient is configured. Heavy
 * dependencies (React Email, the ISO-week helper) are imported dynamically to
 * keep them out of the Payload config build, mirroring the workflow import.
 */
async function notifyDraftsCreated(
    req: PayloadRequest,
    result: CompletedRun,
    source: string,
    inputRunWeek: string | undefined,
): Promise<void> {
    const settings = await loadPipelineSettings(req.payload);
    if (settings.notificationEmails.length === 0) {
        req.payload.logger.info(
            'Content pipeline: drafts created but no notification recipients configured — skipping email.',
        );
        return;
    }

    const { docs } = await req.payload.find({
        collection: 'pages',
        where: { id: { in: result.postIds } },
        depth: 0,
        limit: result.postIds.length,
        locale: I18N_DEFAULT_LOCALE,
    });

    const adminBase = (
        getContentPipelineRuntime(req.payload.config)?.adminBaseUrl ?? ''
    ).replace(/\/$/, '');
    const posts = docs.map((doc) => ({
        title: String(doc.title ?? doc.slug ?? doc.id),
        editUrl: `${adminBase}/admin/collections/pages/${doc.id}`,
        hasImage: !!(doc.meta as { image?: unknown } | undefined)?.image,
    }));

    const { isoWeek } = await import(
        '@repo/content-pipeline/pipeline/iso-week'
    );
    const runWeek = inputRunWeek || isoWeek(new Date());

    const { renderHtmlAndText } = await import('@repo/email/utils/render');
    const { PipelineDraftNotificationEmail, pipelineDraftNotificationSubject } =
        await import('@repo/email/emails/pipeline-draft-notification');

    const email = await renderHtmlAndText(
        PipelineDraftNotificationEmail({
            posts,
            researchedCount: result.topicIds.length,
            rejectedCount: result.rejectedTopicIds.length,
            runWeek,
            source,
        }),
    );

    await req.payload.sendEmail({
        to: settings.notificationEmails,
        subject: pipelineDraftNotificationSubject(posts.length, runWeek),
        ...email,
    });

    req.payload.logger.info(
        `Content pipeline: emailed ${settings.notificationEmails.length} recipient(s) about ${posts.length} new draft(s).`,
    );
}

/**
 * Payload Job task that runs the Mastra content-pipeline workflow. The HTTP
 * endpoint and the admin "Run now" button enqueue this rather than running
 * inline, because a run generates several articles serially and would otherwise
 * block the request / risk a timeout.
 *
 * `retries: 0` is deliberate: a retry would re-run research as a fresh,
 * dedup-protected run (topics from the failed run are no longer `queued`), not
 * resume it — so the right safeguard is surfacing the outcome counts below, not
 * silent re-runs.
 *
 * Mastra is imported dynamically inside the handler so the (heavy) agent +
 * AI-SDK graph is not pulled into the Payload config at build time.
 */
export const runContentPipelineTask: TaskConfig = {
    slug: 'runContentPipeline',
    retries: 0,
    inputSchema: [
        { name: 'source', type: 'text' },
        { name: 'runWeek', type: 'text' },
    ],
    outputSchema: [{ name: 'result', type: 'json' }],
    handler: async ({ input, req }) => {
        const data = input as RunPipelineInput;
        const { runContentPipeline } = await import('../mastra/run');

        // Recover any topics a previous run left stranded mid-draft (a crash or
        // redeploy) before starting a fresh run, so they don't sit in
        // `generating` forever.
        const { sweepStuckTopics } = await import('../mastra/pipeline-core');
        await sweepStuckTopics(req.payload).catch((error) => {
            req.payload.logger.error(
                `Content pipeline: stuck-topic sweep failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        });

        const result = await runContentPipeline(
            data.source === 'competitor' ? 'competitor' : 'seed',
            data.runWeek || undefined,
        );

        if (result.status === 'completed') {
            req.payload.logger.info(
                `Content pipeline run ${result.runId} completed: ` +
                    `${result.topicIds.length} researched, ` +
                    `${result.postIds.length} drafted, ` +
                    `${result.rejectedTopicIds.length} rejected.`,
            );

            // Per-run digest, drafts only — never fail the run on a mail hiccup.
            if (result.postIds.length > 0) {
                await notifyDraftsCreated(
                    req,
                    result,
                    data.source === 'competitor' ? 'competitor' : 'seed',
                    data.runWeek || undefined,
                ).catch((error) => {
                    req.payload.logger.error(
                        `Content pipeline: draft notification email failed: ${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        }`,
                    );
                });
            }
        } else {
            req.payload.logger.error(
                `Content pipeline run ${result.runId} failed: ${result.error}`,
            );
        }

        return { output: { result } };
    },
};

/** Queue the content-pipeline task uses for both scheduled and manual runs. */
export const CONTENT_PIPELINE_QUEUE = 'content-pipeline';

/**
 * Builds the Payload `jobs` config for the content pipeline. The task is always
 * registered (so `payload.jobs.queue` works and generated types stay stable).
 * Disabled mode keeps an inert, always-skipped schedule for the same schema;
 * real schedules and the auto-runner are only wired when enabled.
 *
 * Triggering is fully in-process: the task `schedule` auto-queues a seed run on
 * Mondays and a competitor-gap run on Wednesdays, and `autoRun` drains the
 * queue every 5 minutes. This requires a continuously-running Node process
 * (Atlas's Docker deploy); a serverless deploy would need an external pinger.
 */
export function contentPipelineJobsConfig(
    enabled: boolean,
): NonNullable<Config['jobs']> {
    if (!enabled) {
        return {
            tasks: [
                {
                    ...runContentPipelineTask,
                    schedule: [
                        {
                            cron: '0 0 1 1 *',
                            queue: CONTENT_PIPELINE_QUEUE,
                            hooks: {
                                beforeSchedule: () => ({
                                    shouldSchedule: false,
                                }),
                            },
                        },
                    ],
                },
            ],
        };
    }

    return {
        tasks: [
            {
                ...runContentPipelineTask,
                schedule: [
                    // Seed research — Mondays 06:00 UTC. Default input → 'seed'.
                    { cron: '0 6 * * 1', queue: CONTENT_PIPELINE_QUEUE },
                    // Competitor-gap — Wednesdays 07:00 UTC. The hook keeps the
                    // default "don't double-schedule" guard and sets the source.
                    {
                        cron: '0 7 * * 3',
                        queue: CONTENT_PIPELINE_QUEUE,
                        hooks: {
                            beforeSchedule: async (args) => {
                                const result =
                                    await args.defaultBeforeSchedule(args);
                                return {
                                    ...result,
                                    input: { source: 'competitor' },
                                };
                            },
                        },
                    },
                ],
            },
        ],
        autoRun: [
            { cron: '*/5 * * * *', queue: CONTENT_PIPELINE_QUEUE, limit: 5 },
        ],
    };
}
