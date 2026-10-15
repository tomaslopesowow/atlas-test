import type { ArticleBrief } from '../schemas';

/** Quality signals computed for a generated article body. */
export type ArticleQuality = {
    /** Overall 0–100 score. */
    score: number;
    wordCount: number;
    headingCount: number;
    internalLinkCount: number;
    /** Fraction (0–1) of brief keywords that appear in the body. */
    keywordCoverage: number;
    /**
     * GEO: whether the first paragraph under the first heading is a quotable,
     * self-contained answer (length within the tolerated word range).
     */
    answerFirst: boolean;
    /** GEO: Markdown links to absolute http(s) URLs (external citations). */
    externalLinkCount: number;
    /** GEO: distinct statistic-like tokens (percentages, amounts, counts). */
    statisticCount: number;
    /** Human-readable reasons the article fell short, if any. */
    flags: string[];
};

const MIN_WORDS = 800;
const MIN_HEADINGS = 3;

/**
 * GEO answer-first tolerance. The prompt asks for 40–60 words; the gate accepts
 * a wider band so a tight 38-word answer or a slightly long one isn't flagged —
 * the signal is "a real, quotable opening answer", not an exact length.
 */
const ANSWER_MIN_WORDS = 30;
const ANSWER_MAX_WORDS = 80;
/** GEO: how many distinct statistics a strong article should carry. */
const MIN_STATISTICS = 3;

/**
 * GEO: returns the first plain paragraph after the first H2/H3 heading, or
 * `null` when the body opens (under that heading) with another heading, a list,
 * a blockquote, or nothing. Used to check the answer-first opening — the writer
 * is told to lead with a self-contained answer directly under the first heading.
 */
export function firstParagraphAfterFirstHeading(
    markdown: string,
): string | null {
    const lines = markdown.split('\n');
    const headingIndex = lines.findIndex((line) => /^#{2,3}\s/.test(line));
    if (headingIndex === -1) return null;

    let i = headingIndex + 1;
    while (i < lines.length && lines[i]?.trim() === '') i++;

    const collected: string[] = [];
    for (; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) break;
        if (line.trim() === '') break;
        // A heading, list item, or blockquote marker means there is no plain
        // answer paragraph leading the section.
        if (/^(#{1,6}\s|[-*]\s|>\s|\d+\.\s)/.test(line.trim())) {
            return collected.length ? collected.join(' ') : null;
        }
        collected.push(line.trim());
    }
    return collected.length ? collected.join(' ') : null;
}

/**
 * GEO: counts distinct statistic-like tokens in the body — percentages ("40%",
 * "3,5%"), currency amounts ("€2.000", "$1,500"), thousands-separated numbers
 * in Dutch ("1.500") and English ("1,500") forms, and plain integers of 3+
 * digits. Bare 4-digit years (1900–2099) are excluded, as are numbers inside
 * code spans, fenced code blocks, and link URLs. Deduplicated, so a repeated
 * "40%" counts once.
 */
export function countStatistics(markdown: string): number {
    const cleaned = markdown
        .replace(/```[\s\S]*?```/g, ' ') // fenced code
        .replace(/`[^`]*`/g, ' ') // inline code
        .replace(/\]\([^)]*\)/g, '] '); // link destinations (keep anchor text)

    const STATISTIC_TOKEN =
        /[€$£]\s?\d[\d.,]*|\d+(?:[.,]\d+)?\s?%|\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{3,}\b/g;

    const tokens = new Set<string>();
    for (const match of cleaned.match(STATISTIC_TOKEN) ?? []) {
        const token = match.trim();
        // Exclude bare calendar years, which read as dates, not statistics.
        if (/^\d{4}$/.test(token)) {
            const year = Number(token);
            if (year >= 1900 && year <= 2099) continue;
        }
        tokens.add(token);
    }
    return tokens.size;
}

/**
 * Hard floor: a draft scoring below this, or carrying a hard flag, is too weak
 * to be worth an editor's time — the pipeline rejects it rather than creating
 * the draft. Soft issues above the floor are recorded and surfaced for review.
 *
 * Set to 55: an on-target article (≥1,500 words, ≥5 headings, full keyword
 * coverage) scores ~100 even when internal links aren't expected, and a
 * 1,200-word/4-heading draft still clears ~88 — so only genuinely thin or
 * shallow drafts fall below the floor. The GEO signals (answer-first, external
 * citations, statistics) carry only 15 points combined, so a strong pre-GEO
 * article that happens to miss all three still scores ~85 — comfortably above
 * the floor — while the prompt steers new drafts to earn those points.
 */
export const MIN_DRAFT_SCORE = 55;

/** A word count this low is a failed generation, not a short article. */
const HARD_MIN_WORDS = 300;

/**
 * Whether a quality result has a disqualifying problem — the primary keyword
 * missing from the body (the article isn't about its topic) or a body so short
 * it can't serve the intent. These can't be fixed by an editor's polish, so a
 * draft with either is rejected regardless of its blended score.
 */
export function hasHardFlag(quality: ArticleQuality): boolean {
    return (
        quality.wordCount < HARD_MIN_WORDS ||
        quality.flags.includes('Primary keyword missing from body.')
    );
}

/**
 * Language-agnostic structural floor: a body this short is a failed generation
 * regardless of language, so it's safe to check on a locale whose body is NOT in
 * the brief's language (where the keyword substring check would falsely miss).
 * Used to gate every generated locale, not just the market one.
 */
export function isStructurallyTooShort(quality: ArticleQuality): boolean {
    return quality.wordCount < HARD_MIN_WORDS;
}

/** Options that adapt the gate to the run's reality. */
export type ScoreOptions = {
    /**
     * Whether internal links should be expected (and their absence penalised).
     * Pass `false` when there are no published posts to link to yet — a new
     * blog shouldn't be marked down for something impossible. Defaults to true.
     */
    expectInternalLinks?: boolean;
};

/**
 * Deterministic quality gate for a generated article. Cheap, reproducible
 * checks (length, structure, keyword coverage, internal linking) that flag a
 * weak draft for human review before it is published — the kind of signals an
 * LLM-judge would produce, without the extra cost or variance. Returns a 0–100
 * score and a list of human-readable flags.
 *
 * Score the body in the SAME language as `brief.primaryKeyword` (keyword
 * coverage is a literal substring check), and pass `expectInternalLinks: false`
 * when the blog has no posts to link to — otherwise a genuinely good article is
 * unfairly capped.
 */
export function scoreArticleQuality(
    bodyMarkdown: string,
    brief: Pick<ArticleBrief, 'primaryKeyword' | 'secondaryKeywords'>,
    options: ScoreOptions = {},
): ArticleQuality {
    const { expectInternalLinks = true } = options;
    const text = bodyMarkdown.toLowerCase();
    const wordCount = bodyMarkdown.split(/\s+/).filter(Boolean).length;
    const headingCount = (bodyMarkdown.match(/^#{2,3}\s/gm) ?? []).length;
    const internalLinkCount = (bodyMarkdown.match(/\]\((\/[^)]+)\)/g) ?? [])
        .length;
    const externalLinkCount = (bodyMarkdown.match(/\]\(\s*https?:\/\//g) ?? [])
        .length;

    const keywords = [brief.primaryKeyword, ...brief.secondaryKeywords].filter(
        Boolean,
    );
    const covered = keywords.filter((keyword) =>
        text.includes(keyword.toLowerCase()),
    ).length;
    const keywordCoverage = keywords.length ? covered / keywords.length : 1;

    const answerParagraph = firstParagraphAfterFirstHeading(bodyMarkdown);
    const answerWords = answerParagraph
        ? answerParagraph.split(/\s+/).filter(Boolean).length
        : 0;
    const answerFirst =
        answerWords >= ANSWER_MIN_WORDS && answerWords <= ANSWER_MAX_WORDS;
    const statisticCount = countStatistics(bodyMarkdown);

    const flags: string[] = [];
    if (wordCount < MIN_WORDS) flags.push(`Short (${wordCount} words).`);
    if (headingCount < MIN_HEADINGS)
        flags.push(`Few sections (${headingCount} headings).`);
    if (!text.includes(brief.primaryKeyword.toLowerCase()))
        flags.push('Primary keyword missing from body.');
    if (expectInternalLinks && internalLinkCount === 0)
        flags.push('No internal links.');
    if (!answerFirst) flags.push('No answer-first opening.');
    if (externalLinkCount === 0) flags.push('No external citations.');
    if (statisticCount < MIN_STATISTICS)
        flags.push(`Few statistics (${statisticCount} found).`);

    // Weighted blend of the components that apply, renormalised to 0–100. The
    // internal-link component only counts when links are expected, so an early
    // article on a link-poor blog isn't permanently capped below 100. The GEO
    // components (answer-first, external citations, statistics) add 15 points so
    // they nudge rather than gate — see MIN_DRAFT_SCORE.
    const components: { value: number; weight: number }[] = [
        { value: Math.min(wordCount / 1500, 1), weight: 30 },
        { value: Math.min(headingCount / 5, 1), weight: 15 },
        { value: keywordCoverage, weight: 25 },
        { value: answerFirst ? 1 : 0, weight: 5 },
        { value: Math.min(externalLinkCount, 1), weight: 5 },
        { value: Math.min(statisticCount / MIN_STATISTICS, 1), weight: 5 },
    ];
    if (expectInternalLinks) {
        components.push({
            value: Math.min(internalLinkCount / 2, 1),
            weight: 15,
        });
    }
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const score = Math.round(
        (components.reduce((sum, c) => sum + c.value * c.weight, 0) /
            totalWeight) *
            100,
    );

    return {
        score,
        wordCount,
        headingCount,
        internalLinkCount,
        keywordCoverage,
        answerFirst,
        externalLinkCount,
        statisticCount,
        flags,
    };
}
