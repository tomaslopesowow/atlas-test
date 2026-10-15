/**
 * Phase 2 — runs the keyword-research half of the pipeline against the live
 * DataForSEO + Claude APIs and persists the results as `queued` topics:
 *
 *   keyword ideas → score → cluster → dedup → brief → content-pipeline-topics
 *
 * Run from apps/web:
 *   pnpm pipeline:research-local
 *
 * Requires local Mongo (`pnpm docker:up`) and DATAFORSEO_LOGIN/PASSWORD +
 * ANTHROPIC_API_KEY in .env.local. Costs a small amount of DataForSEO balance
 * (~$0.03 per run) plus a few Claude tokens per brief, so it is capped at a
 * handful of new topics per run. Seeds are hardcoded here for a standalone test;
 * the weekly run reads them from the `content-pipeline-settings` admin global.
 */
import { isoWeek } from '@repo/content-pipeline/pipeline/iso-week';
import { getPayloadClient } from '@/features/payload/client';
import { researchAndPersistTopics } from '../mastra/pipeline-core';
import { getContentPipelineEngine } from '../pipeline/engine';

const CONFIG = {
    seedTerms: ['order management software'],
    locationCode: 2840, // United States
    languageCode: 'en',
    minVolume: 100,
    maxDifficulty: 60,
    maxNewTopics: 3,
    // 'strict' so a local run exercises the full near-duplicate gate (drops
    // near-dups as well as exact duplicates). Production defaults to
    // 'duplicates-only' via the settings global.
    dedupSensitivity: 'strict' as const,
    brandVoice:
        'Clear, practical, and expert — written for operations and e-commerce teams. No fluff.',
};

{
    const payload = await getPayloadClient();
    const engine = getContentPipelineEngine(payload);
    const runWeek = isoWeek(new Date());

    console.log(
        `Researching seeds: ${CONFIG.seedTerms.join(', ')} (${runWeek})`,
    );

    const ids = await researchAndPersistTopics(payload, engine, {
        ...CONFIG,
        runWeek,
    });

    console.log(
        `✓ Phase 2 verified: persisted ${ids.length} new topics as 'queued'. Inspect them in admin → Content → Pipeline topics.`,
    );
}
