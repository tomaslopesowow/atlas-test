import { z } from 'zod';

/**
 * Shared Zod schemas + types for the content pipeline's agent outputs. Kept in
 * one place because the same shapes are used by the generation agents, the
 * workflow steps, and the `content-pipeline-topics.brief` JSON field.
 */

/** A writing brief produced from a keyword cluster. Stored on the topic. */
export type ArticleBrief = {
    title: string;
    angle: string;
    /** Why this topic + angle were chosen — surfaced to the reviewing editor. */
    rationale: string;
    outline: string[];
    primaryKeyword: string;
    secondaryKeywords: string[];
    /**
     * Real Google "People also ask" questions for the primary keyword, fetched
     * at research time in the market language. Optional — topics briefed before
     * this field existed (or whose SERP fetch failed) simply don't have it.
     */
    peopleAlsoAskQuestions?: string[];
};

/** Structured output the strategist agent returns for a brief. */
export const BriefSchema = z.object({
    title: z
        .string()
        .describe(
            'A compelling, SEO-friendly article title (≤ 65 characters).',
        ),
    angle: z
        .string()
        .describe(
            'One sentence on the unique angle and the search intent the article serves.',
        ),
    rationale: z
        .string()
        .describe(
            '1–2 sentences explaining why this topic and angle were chosen: which keyword, intent and competitor signals it targets and why it can realistically rank. Written for a human editor reviewing the draft.',
        ),
    outline: z
        .array(z.string())
        .describe('5–8 H2 section headings, in reading order.'),
});

/**
 * SEO max lengths for the generated meta fields. These are *guidance* only — the
 * limits are stated in the field descriptions below (so the model aims for them)
 * and enforced by clamping in `generate.ts`. They are deliberately NOT Zod
 * `.max()` constraints: a `.max()` makes structured-output validation throw when
 * the model overshoots, which rejects the whole locale (and fails the topic when
 * it's the default locale) instead of salvaging an otherwise-good article.
 */
export const META_LIMITS = {
    title: 65,
    excerpt: 160,
    metaDescription: 155,
} as const;

/** Structured output the strategist agent returns for a locale's metadata. */
export const MetaSchema = z.object({
    title: z
        .string()
        .describe(
            `Localized article title (≤ ${META_LIMITS.title} characters), may refine the brief title.`,
        ),
    excerpt: z
        .string()
        .describe(
            `A one-sentence standfirst shown under the title and on cards (≤ ${META_LIMITS.excerpt} chars).`,
        ),
    metaDescription: z
        .string()
        .describe(
            `An SEO meta description (≤ ${META_LIMITS.metaDescription} chars) that earns the click.`,
        ),
    faq: z
        .array(
            z.object({
                q: z
                    .string()
                    .describe(
                        'A real question a reader of this article would search.',
                    ),
                a: z
                    .string()
                    .describe(
                        'A concise, self-contained answer (1–3 sentences) — useful on its own.',
                    ),
            }),
        )
        .min(3)
        .max(5)
        .describe(
            'Three to five question/answer pairs the article addresses, for a FAQ rich result. Questions and answers written entirely in the article language.',
        ),
});

/**
 * Structured output the near-duplicate judge returns for a candidate topic,
 * classified against a shortlist of existing topics/posts. `matchedRef` is the
 * stable `topic:<id>` / `post:<id>` ref of the single closest existing item.
 */
export const DedupVerdictSchema = z.object({
    verdict: z
        .enum(['distinct', 'near-duplicate', 'duplicate'])
        .describe(
            'distinct = a genuinely different topic; near-duplicate = substantially overlapping intent that would compete or cannibalise; duplicate = the same article.',
        ),
    matchedRef: z
        .string()
        .nullable()
        .describe(
            'The ref (e.g. "topic:123" or "post:456") of the single closest existing item, or null if none overlap.',
        ),
    reason: z
        .string()
        .describe(
            'One sentence naming the overlapping search intent (or why it is distinct).',
        ),
    confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence in the verdict, 0–1.'),
});

/**
 * Structured output the category classifier returns for a generated article,
 * picking the single best-fit category from a provided list. `categoryRef` is a
 * plain nullable string (NOT a z.enum of ids): an enum would make structured-
 * output validation throw on a hallucinated ref — same reasoning `META_LIMITS`
 * avoids `.max()` above. The allowed refs are listed in the prompt and the
 * returned ref is validated against them in `classifyCategory`.
 */
export const CategoryVerdictSchema = z.object({
    categoryRef: z
        .string()
        .nullable()
        .describe(
            'The ref (e.g. "category:123") of the single best-fit category from the provided list, or null if none fits the article\'s search intent.',
        ),
    confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence in the chosen category, 0–1.'),
    reason: z
        .string()
        .describe(
            'One sentence naming the search intent that justifies the choice.',
        ),
});

/**
 * Frozen "why this article" snapshot persisted on the generated post
 * (`posts.aiReasoning`), so the reasoning survives even if the source topic is
 * later deleted. Rendered read-only in the admin for the reviewing editor.
 */
export type GenerationReasoning = {
    source: 'seed' | 'competitor';
    runWeek: string;
    /** Cluster opportunity score (volume × intent ÷ difficulty, summed). */
    opportunityScore: number;
    primaryKeyword: string;
    primaryKeywordVolume?: number;
    primaryKeywordDifficulty?: number;
    primaryKeywordIntent?: string;
    /** Present for competitor-gap topics: who ranks for the primary keyword. */
    competitor?: { domain?: string; rank?: number };
    /** A few representative cluster keywords with their metrics. */
    topKeywords: {
        keyword: string;
        searchVolume?: number;
        difficulty?: number;
    }[];
    /** The brief's angle and rationale. */
    angle: string;
    rationale: string;
    /** Deterministic quality-gate result for the default-locale body. */
    quality: { score: number; flags: string[] };
    /**
     * Auto-classified category (name + why), when the LLM picked one with enough
     * confidence; absent when the run's default/fallback category was used.
     */
    category?: { name: string; reason: string; confidence: number };
};

/** Maps a locale code to a language name the model writes more reliably in. */
export function languageName(code: string): string {
    const names: Record<string, string> = { en: 'English', nl: 'Dutch' };
    return names[code] ?? code;
}
