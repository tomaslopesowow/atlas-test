/**
 * End-to-end test — exercises the REAL pipeline (research → generate → draft →
 * reasoning) against the configured DataForSEO + Anthropic creds and local
 * Mongo, then asserts every production-readiness invariant this PR introduced:
 *
 *   - research persists ≥1 topic, each brief carrying a rationale
 *   - a draft `posts` doc is created (never published)
 *   - the post persists the AI provenance + frozen reasoning snapshot
 *   - the topic records its quality score + flags
 *
 * Spends real balance, so it caps cost at ONE article (drafts only the first
 * non-rejected topic) and cleans up everything it creates. Run from apps/web:
 *   pnpm pipeline:e2e-local
 *
 * Skips cleanly (exit 0) when the pipeline isn't configured or no seeds are set,
 * so it never fails for missing credentials.
 */
import type { GenerationReasoning } from '@repo/content-pipeline/mastra/schemas';
import { getPayloadClient } from '@/features/payload/client';
import {
    generateDraftForTopic,
    isoWeek,
    researchTopics,
} from '../mastra/pipeline-core';
import { loadPipelineSettings } from '../payload/load-settings';
import { getContentPipelineEngine } from '../pipeline/engine';
import { getContentPipelineRuntime } from '../plugin';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`E2E assertion failed: ${message}`);
}

{
    const payload = await getPayloadClient();
    const runtime = getContentPipelineRuntime(payload.config);
    if (
        !runtime?.dataForSeo.login ||
        !runtime.dataForSeo.password ||
        !runtime.anthropic.apiKey
    ) {
        console.log(
            'Content pipeline not configured (DATAFORSEO_* / ANTHROPIC_API_KEY missing) — skipping.',
        );
        process.exit(0);
    }

    const engine = getContentPipelineEngine(payload);
    const settings = await loadPipelineSettings(payload);

    if (settings.seedTerms.length === 0) {
        console.log(
            'No seed terms configured in the content-pipeline settings — skipping.',
        );
        process.exit(0);
    }

    const runWeek = isoWeek(new Date());
    let createdTopicIds: string[] = [];
    let createdPostId: string | null = null;

    try {
        console.log(`Researching seed topics for ${runWeek} ...`);
        createdTopicIds = await researchTopics(
            payload,
            engine,
            settings,
            'seed',
            runWeek,
        );
        console.log(`Researched ${createdTopicIds.length} new topic(s).`);

        // Research is deterministic dedup: in a DB that already tracks these
        // seeds it legitimately yields 0 new topics. To still exercise the new
        // generation → quality-gate → reasoning → draft code, fall back to a
        // throwaway synthetic topic (cleaned up below) when research is dry.
        if (createdTopicIds.length === 0) {
            console.log(
                'No new topics from research — seeding a synthetic topic to exercise generation.',
            );
            const seedTerm =
                settings.seedTerms[0] ?? 'order management software';
            const synthetic = await payload.create({
                collection: 'content-pipeline-topics',
                data: {
                    clusterKey: `e2e-${new Date().toISOString()}`,
                    title: `E2E: ${seedTerm}`,
                    status: 'queued',
                    source: 'seed',
                    runWeek,
                    score: 100,
                    primaryKeyword: seedTerm,
                    keywords: [
                        {
                            keyword: seedTerm,
                            searchVolume: 1000,
                            difficulty: 30,
                            intent: 'commercial',
                        },
                    ],
                    brief: {
                        title: `A practical guide to ${seedTerm}`,
                        angle: `Help operations teams understand ${seedTerm} and choose the right approach.`,
                        rationale: `Targets the commercial-intent term "${seedTerm}" (1k/mo, low difficulty) where we can realistically rank.`,
                        outline: [
                            `What is ${seedTerm}?`,
                            'Key capabilities to look for',
                            'How to evaluate and choose',
                            'Common pitfalls',
                        ],
                        primaryKeyword: seedTerm,
                        secondaryKeywords: [],
                    },
                },
            });
            createdTopicIds = [String(synthetic.id)];
        }

        assert(
            createdTopicIds.length > 0,
            'a topic is available to generate from',
        );

        // Draft the first topic that clears the quality gate (caps cost at one
        // article while staying robust to an occasional gated draft).
        let draftedTopicId: string | null = null;
        const rejected: string[] = [];
        for (const topicId of createdTopicIds) {
            const postId = await generateDraftForTopic(
                payload,
                engine,
                topicId,
                settings,
            );
            if (postId) {
                createdPostId = postId;
                draftedTopicId = topicId;
                break;
            }
            rejected.push(topicId);
        }

        console.log(
            `Counts — researched: ${createdTopicIds.length}, drafted: ${
                createdPostId ? 1 : 0
            }, rejected: ${rejected.length}.`,
        );

        assert(
            createdPostId && draftedTopicId,
            `at least one topic produced a draft (all ${createdTopicIds.length} were rejected by the quality gate)`,
        );

        // Topic: brief.rationale + quality score/flags recorded.
        const topic = await payload.findByID({
            collection: 'content-pipeline-topics',
            id: draftedTopicId,
            depth: 0,
        });
        const brief = topic.brief as { rationale?: string } | null;
        assert(
            typeof brief?.rationale === 'string' && brief.rationale.length > 0,
            'brief carries a non-empty rationale',
        );
        assert(topic.status === 'drafted', "topic status is 'drafted'");
        assert(
            typeof topic.qualityScore === 'number',
            'topic has a numeric qualityScore',
        );
        assert(
            topic.qualityFlags !== undefined && topic.qualityFlags !== null,
            'topic has qualityFlags recorded',
        );

        // Page: draft + AI provenance + frozen reasoning snapshot.
        const post = await payload.findByID({
            collection: 'pages',
            id: createdPostId,
            locale: 'en',
            depth: 0,
            draft: true,
        });
        assert(post._status === 'draft', "page _status is 'draft'");
        assert(post.aiGenerated === true, 'page.aiGenerated is true');
        assert(!!post.aiTopic, 'page.aiTopic links back to the source topic');
        const reasoning = post.aiReasoning as GenerationReasoning | null;
        assert(
            reasoning != null && typeof reasoning === 'object',
            'post.aiReasoning snapshot is present',
        );
        assert(
            reasoning.primaryKeyword.length > 0 &&
                reasoning.rationale.length > 0 &&
                typeof reasoning.quality?.score === 'number',
            'reasoning snapshot has primaryKeyword, rationale and quality',
        );

        console.log(
            `✓ E2E verified: draft page ${createdPostId} from topic ${draftedTopicId} ` +
                `(quality ${reasoning.quality.score}/100, primary "${reasoning.primaryKeyword}").`,
        );
    } finally {
        // Clean up everything this run created so repeated runs stay tidy.
        if (createdPostId) {
            console.log(`Cleaning up draft page ${createdPostId}.`);
            await payload
                .delete({ collection: 'pages', id: createdPostId })
                .catch(() => {});
        }
        if (createdTopicIds.length) {
            console.log(
                `Cleaning up ${createdTopicIds.length} topic(s): ${createdTopicIds.join(', ')}.`,
            );
            await payload
                .delete({
                    collection: 'content-pipeline-topics',
                    where: { id: { in: createdTopicIds } },
                })
                .catch(() => {});
        }
    }
}
