/**
 * Image step — generates a branded hero illustration via fal.ai, uploads it to
 * the `media` collection, and (when a drafted topic with a linked post exists)
 * attaches it to that post's cover so it can be verified on the blog.
 *
 * Run from apps/web (needs Docker Mongo up + .env.local with FAL_KEY):
 *   pnpm pipeline:image-local
 *
 * Spends NO DataForSEO balance — only a fal image generation + a little Claude
 * for alt text. Falls back to a synthetic brief when no topic is available, so
 * the image path can be smoke-tested in isolation.
 */
import type { ArticleBrief } from '@repo/content-pipeline/mastra/schemas';
import { getPayloadClient } from '@/features/payload/client';
import { createHeroImageForTopic } from '../images';
import { loadPipelineSettings } from '../payload/load-settings';
import { getContentPipelineEngine } from '../pipeline/engine';

const SYNTHETIC_BRIEF: ArticleBrief = {
    title: 'Automating order-to-cash with a direct ERP integration',
    angle: 'How operations teams remove manual order entry by syncing orders straight into the ERP.',
    rationale: 'Smoke-test brief for the image pipeline.',
    outline: ['The manual bottleneck', 'Direct ERP sync', 'What changes'],
    primaryKeyword: 'order to cash automation',
    secondaryKeywords: ['erp integration', 'order processing'],
};

{
    const payload = await getPayloadClient();
    const engine = getContentPipelineEngine(payload);
    const settings = await loadPipelineSettings(payload);

    // Force the feature on for the test even if the settings toggle is off
    // (style/ratio fallbacks are already applied by loadPipelineSettings).
    const testSettings = {
        ...settings,
        enableImageGeneration: true,
    };

    // Prefer a drafted topic with a linked post, so we can attach + verify on
    // the blog; otherwise smoke-test with a synthetic brief (media only).
    const drafted = (
        await payload.find({
            collection: 'content-pipeline-topics',
            where: { status: { equals: 'drafted' }, post: { exists: true } },
            sort: '-score',
            limit: 1,
            depth: 0,
        })
    ).docs[0];

    const brief = (drafted?.brief as ArticleBrief | null) ?? SYNTHETIC_BRIEF;
    const postId = drafted?.post ? String(drafted.post) : null;

    const titlesByLocale: Record<string, string> = {};
    if (postId) {
        for (const locale of testSettings.targetLocales) {
            const doc = await payload.findByID({
                collection: 'pages',
                id: postId,
                locale,
                depth: 0,
                draft: true,
            });
            if (doc?.title) titlesByLocale[locale] = String(doc.title);
        }
    }
    if (Object.keys(titlesByLocale).length === 0) {
        titlesByLocale.en = brief.title;
    }

    console.log(
        `Generating hero image for "${brief.title}" (ratio: ${testSettings.imageAspectRatio}) ...`,
    );

    const mediaId = await createHeroImageForTopic(
        payload,
        engine,
        brief,
        testSettings,
        titlesByLocale,
    );

    if (!mediaId) {
        throw new Error(
            'Image generation returned null — check FAL_KEY and the warning logged above.',
        );
    }

    const media = await payload.findByID({
        collection: 'media',
        id: mediaId,
        depth: 0,
    });
    console.log(
        `✓ media ${mediaId}: ${media.mimeType} ${media.width}x${media.height}, url=${media.url}, alt(en)=${media.description}`,
    );

    if (postId) {
        await payload.update({
            collection: 'pages',
            id: postId,
            data: { meta: { image: mediaId } },
        });
        const post = await payload.findByID({
            collection: 'pages',
            id: postId,
            locale: 'en',
            depth: 0,
            draft: true,
        });
        console.log(
            `✓ attached cover to page ${postId} (slug=${post.slug}) — verify at ${post.path ?? `/${post.slug}`}`,
        );
    } else {
        console.log(
            'No drafted topic with a linked post found — generated media only (no post to attach to). Run `pnpm pipeline:generate-local` first to test the full attach + blog render.',
        );
    }

    console.log('✓ Image step verified.');
}
