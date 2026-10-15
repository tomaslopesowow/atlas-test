import { getPayloadClient } from '@/features/payload/client';
import { getContentPipelineMastra } from './index';

export type PipelineSource = 'seed' | 'competitor';

export type PipelineRunResult =
    | {
          status: 'completed';
          runId: string;
          topicIds: string[];
          postIds: string[];
          rejectedTopicIds: string[];
      }
    | { status: 'failed'; runId: string; error: string };

/**
 * Starts a content-pipeline workflow run for the given source. Research produces
 * `queued` topics and the draft step turns them into **draft** posts for
 * editorial review — there is no human-in-the-loop suspension. Returns the
 * completed result (with counts so an empty run isn't mistaken for a healthy
 * one) or a failure. The Payload job and the admin "Run now" button call this.
 */
export async function runContentPipeline(
    source: PipelineSource,
    runWeek?: string,
): Promise<PipelineRunResult> {
    const payload = await getPayloadClient();
    const mastra = getContentPipelineMastra(payload);
    const workflow = mastra.getWorkflow('contentPipeline');
    const run = await workflow.createRun();
    const result = await run.start({ inputData: { source, runWeek } });

    if (result.status === 'success') {
        return {
            status: 'completed',
            runId: run.runId,
            topicIds: result.result.topicIds,
            postIds: result.result.postIds,
            rejectedTopicIds: result.result.rejectedTopicIds,
        };
    }

    return {
        status: 'failed',
        runId: run.runId,
        error:
            result.status === 'failed'
                ? result.error.message
                : `Workflow ${result.status}.`,
    };
}
