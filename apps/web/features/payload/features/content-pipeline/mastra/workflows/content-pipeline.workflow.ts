import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { getPayloadClient } from '@/features/payload/client';
import { loadPipelineSettings } from '../../payload/load-settings';
import { getContentPipelineEngine } from '../../pipeline/engine';
import { draftTopics, isoWeek, researchTopics } from '../pipeline-core';

const sourceSchema = z.enum(['seed', 'competitor']);

const workflowInputSchema = z.object({
    source: sourceSchema.default('seed'),
    /** ISO week tag; defaults to the current week. */
    runWeek: z.string().optional(),
});

const workflowOutputSchema = z.object({
    topicIds: z.array(z.string()),
    postIds: z.array(z.string()),
    rejectedTopicIds: z.array(z.string()),
});

/**
 * Stage 1 — research → score → cluster → dedup → brief, persisting `queued`
 * topics. Loads Payload and settings itself (Payload is not serializable, so it
 * can't be passed through workflow state).
 */
const researchStep = createStep({
    id: 'research',
    inputSchema: workflowInputSchema,
    outputSchema: z.object({
        topicIds: z.array(z.string()),
    }),
    execute: async ({ inputData }) => {
        const payload = await getPayloadClient();
        const engine = getContentPipelineEngine(payload);
        const settings = await loadPipelineSettings(payload);
        const runWeek = inputData.runWeek ?? isoWeek(new Date());

        const topicIds = await researchTopics(
            payload,
            engine,
            settings,
            inputData.source,
            runWeek,
        );

        return { topicIds };
    },
});

/**
 * Stage 2 — generate the article(s) per locale via the SEO-writer agent, apply
 * the quality gate, convert to Lexical, and create a **draft** post (a human
 * publishes it). Each topic is isolated in its own try/catch inside
 * {@link draftTopics}; a weak or failed topic is marked `rejected`. There is no
 * suspend/resume approval — research produces drafts and editorial approval is
 * the act of publishing the draft.
 */
const draftStep = createStep({
    id: 'draft',
    inputSchema: z.object({
        topicIds: z.array(z.string()),
    }),
    outputSchema: workflowOutputSchema,
    execute: async ({ inputData }) => {
        const payload = await getPayloadClient();
        const engine = getContentPipelineEngine(payload);
        const settings = await loadPipelineSettings(payload);

        const { postIds, rejectedTopicIds } = await draftTopics(
            payload,
            engine,
            inputData.topicIds,
            settings,
        );

        return {
            topicIds: inputData.topicIds,
            postIds,
            rejectedTopicIds,
        };
    },
});

/**
 * The content pipeline as a Mastra workflow: research → draft. Triggered for the
 * `seed` source weekly and `competitor` daily. Every generated article is a
 * draft for editorial review; nothing publishes automatically.
 */
export const contentPipelineWorkflow = createWorkflow({
    id: 'content-pipeline',
    inputSchema: workflowInputSchema,
    outputSchema: workflowOutputSchema,
})
    .then(researchStep)
    .then(draftStep)
    .commit();
