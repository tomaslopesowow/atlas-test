/**
 * Verifies the competitor-gap source end-to-end against a US competitor —
 * DataForSEO Labs `ranked_keywords` is currently erroring for the Netherlands,
 * so we prove the code path at location 2840 where Labs works. Researches a
 * competitor's content gap, persists topics tagged `source: 'competitor'` (with
 * competitor domain + rank), then drafts the top one to prove
 * competitor-analysis → blog post.
 *
 * Run from apps/web (needs local Mongo + DataForSEO/Anthropic creds):
 *   pnpm pipeline:competitor-local
 *
 * Uses a local CONFIG (not the settings global) so it can target a US competitor
 * regardless of the admin's NL config. Real Dutch competitors get configured in
 * the `content-pipeline-settings` global once NL Labs recovers.
 */
import { isoWeek } from '@repo/content-pipeline/pipeline/iso-week';
import { getPayloadClient } from '@/features/payload/client';
import {
    generateDraftForTopic,
    researchCompetitorsAndPersistTopics,
} from '../mastra/pipeline-core';
import { loadPipelineSettings } from '../payload/load-settings';
import { getContentPipelineEngine } from '../pipeline/engine';

const CONFIG = {
    competitorDomains: ['brightpearl.com'],
    ownDomain: undefined as string | undefined,
    seedTerms: ['order management', 'inventory management', 'order fulfilment'],
    locationCode: 2840, // United States
    languageCode: 'en',
    minVolume: 50,
    maxDifficulty: 50,
    maxNewTopics: 2,
    limitPerDomain: 100,
    dedupSensitivity: 'duplicates-only' as const,
    brandVoice:
        'Clear, practical, and expert — written for operations and e-commerce teams. No fluff.',
};

{
    const payload = await getPayloadClient();
    const engine = getContentPipelineEngine(payload);
    const runWeek = isoWeek(new Date());

    console.log(
        `Competitor gap: [${CONFIG.competitorDomains.join(', ')}] loc=${CONFIG.locationCode} lang=${CONFIG.languageCode} maxDifficulty=${CONFIG.maxDifficulty}`,
    );

    const topicIds = await researchCompetitorsAndPersistTopics(
        payload,
        engine,
        {
            ...CONFIG,
            runWeek,
        },
    );

    console.log(`Persisted ${topicIds.length} competitor topics:`);
    for (const id of topicIds) {
        const topic = await payload.findByID({
            collection: 'content-pipeline-topics',
            id,
            depth: 0,
        });
        console.log(
            `  • "${topic.title}" source=${topic.source} competitor=${topic.competitorDomain} rank=${topic.competitorRank} score=${topic.score} key="${topic.primaryKeyword}"`,
        );
    }

    if (topicIds.length === 0) {
        console.log(
            'No competitor topics — gap empty, all deduped, or the domain was unavailable (Labs outage). Done.',
        );
        process.exit(0);
    }

    // Prove competitor topic → blog post on the top one.
    const settings = await loadPipelineSettings(payload);
    const postId = await generateDraftForTopic(
        payload,
        engine,
        topicIds[0],
        settings,
    );
    if (!postId) {
        throw new Error(
            'Competitor topic was rejected by the quality gate — no draft created.',
        );
    }
    const post = await payload.findByID({
        collection: 'pages',
        id: postId,
        locale: 'en',
        depth: 0,
        draft: true,
    });
    const blocks = Array.isArray(post.blocks) ? post.blocks : [];

    console.log(
        `✓ Competitor-gap verified: drafted page ${postId} from a competitor topic — _status=${post._status}, blocks=${blocks.length}, title="${post.title}".`,
    );
    process.exit(0);
}
