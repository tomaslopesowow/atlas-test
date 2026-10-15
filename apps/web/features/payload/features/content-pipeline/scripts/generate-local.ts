/**
 * Phase 3 — generates a full blog draft from an existing `queued` topic, in
 * every target locale, and links it back to the topic:
 *
 *   queued topic → article per locale (Claude) → Markdown → Lexical → draft post
 *
 * Run from apps/web (after `pnpm pipeline:research-local` has queued a topic):
 *   pnpm pipeline:generate-local
 *
 * Uses an existing topic, so it spends NO DataForSEO balance — only Claude
 * tokens for the article(s). Reads config from the `content-pipeline-settings`
 * global (with fallbacks), so it generates a draft (not published) by default.
 */
import { getPayloadClient } from '@/features/payload/client';
import { generateDraftForTopic } from '../mastra/pipeline-core';
import { loadPipelineSettings } from '../payload/load-settings';
import { getContentPipelineEngine } from '../pipeline/engine';

{
    const payload = await getPayloadClient();
    const engine = getContentPipelineEngine(payload);
    const settings = await loadPipelineSettings(payload);

    const queued = (
        await payload.find({
            collection: 'content-pipeline-topics',
            where: { status: { equals: 'queued' } },
            sort: '-score',
            limit: 1,
            depth: 0,
        })
    ).docs[0];

    if (!queued) {
        console.log(
            'No queued topics found. Run `pnpm pipeline:research-local` first.',
        );
        process.exit(0);
    }

    console.log(
        `Generating draft for "${queued.title}" in locales: ${settings.targetLocales.join(', ')} ...`,
    );

    const postId = await generateDraftForTopic(
        payload,
        engine,
        String(queued.id),
        settings,
    );

    if (!postId) {
        throw new Error(
            'Topic was rejected by the quality gate — no draft created.',
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
    const firstBlock = blocks[0] as { blockType?: string } | undefined;

    const topic = await payload.findByID({
        collection: 'content-pipeline-topics',
        id: String(queued.id),
        depth: 0,
    });

    console.log(
        `Created page ${postId}: _status=${post._status}, slug=${post.slug}, blocks=${blocks.length}, firstBlock=${firstBlock?.blockType}`,
    );
    console.log(
        `Topic status now: ${topic.status}, linked post: ${topic.post}`,
    );

    if (firstBlock?.blockType !== 'rich-text') {
        throw new Error(
            `Expected a rich-text block, got '${firstBlock?.blockType}' — article generation or Lexical conversion likely failed.`,
        );
    }
    if (post._status !== 'draft') {
        throw new Error(`Expected a draft, got _status '${post._status}'.`);
    }
    if (topic.status !== 'drafted') {
        throw new Error(`Topic not marked done — status is '${topic.status}'.`);
    }

    console.log(
        '✓ Phase 3 verified: full draft post generated from a queued topic across all target locales.',
    );
}
