import type { ContentPipelineEngine } from '@repo/content-pipeline/engine';
import { CategoryVerdictSchema } from '@repo/content-pipeline/mastra/schemas';
import { type AppLocale, I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { Payload } from 'payload';

/**
 * Below this confidence the classifier's pick is treated as an abstention and
 * the caller assigns no tag. Mirrors the dedup gate's "low-stakes classifier"
 * framing — we'd rather under-tag than mis-tag.
 */
const TAG_MIN_CONFIDENCE = 0.5;

type ClassifyOptions = {
    /** Locale to read tag labels in (the market language); falls back to default. */
    marketLocale?: AppLocale;
    /** Minimum confidence to accept the pick (default {@link TAG_MIN_CONFIDENCE}). */
    minConfidence?: number;
};

/**
 * Picks the single best-fit tag for a generated article via the
 * {@link categoryClassifierAgent}, judging by search intent across languages.
 *
 * Returns the chosen `{ tagId, name, reason, confidence }`, or `null` when
 * there's nothing meaningful to choose (0–1 tags exist), the model abstains
 * (null ref), returns a ref that isn't in the allowed set (hallucination), or is
 * below the confidence floor. The caller assigns no tag on `null`.
 *
 * Pure (no try/catch) like the dedup gate's `judgeCandidate` — the caller owns
 * error handling so a classifier hiccup never fails the run.
 */
export async function classifyTag(
    payload: Payload,
    engine: ContentPipelineEngine,
    article: {
        title: string;
        angle: string;
        primaryKeyword: string;
        secondaryKeywords: string[];
    },
    options?: ClassifyOptions,
): Promise<{
    tagId: string;
    name: string;
    reason: string;
    confidence: number;
} | null> {
    const { docs } = await payload.find({
        collection: 'tags',
        limit: 100,
        depth: 0,
        locale: options?.marketLocale ?? I18N_DEFAULT_LOCALE,
    });

    // Nothing to choose from / no real choice — let the caller skip tagging.
    if (docs.length < 2) return null;

    // Stable ref → tag, and a numbered list for the prompt. Refs (not raw ids)
    // keep the model from inventing a plausible-looking id.
    const byRef = new Map<string, { id: string; name: string }>();
    const lines = docs.map((doc, i) => {
        const id = String(doc.id);
        const ref = `tag:${id}`;
        const name = String(doc.label ?? doc.value ?? id);
        byRef.set(ref, { id, name });
        return `${i + 1}. [${ref}] "${name}"`;
    });

    const secondary = article.secondaryKeywords.join(', ') || 'none';
    const prompt = `Article:
- Title: "${article.title}"
- Angle: ${article.angle}
- Primary keyword: "${article.primaryKeyword}"
- Secondary keywords: ${secondary}

Tags (choose exactly one ref, or null if none fits):
${lines.join('\n')}

Pick the tag whose reader search intent best matches the article.`;

    const { object } = await engine.agents.categoryClassifierAgent.generate(
        prompt,
        { structuredOutput: { schema: CategoryVerdictSchema } },
    );

    if (!object.categoryRef) return null;

    const match = byRef.get(object.categoryRef);
    if (!match) {
        payload.logger.warn(
            `Content pipeline: tag classifier returned an unknown ref "${object.categoryRef}" — assigning no tag.`,
        );
        return null;
    }

    if (object.confidence < (options?.minConfidence ?? TAG_MIN_CONFIDENCE)) {
        return null;
    }

    return {
        tagId: match.id,
        name: match.name,
        reason: object.reason,
        confidence: object.confidence,
    };
}
