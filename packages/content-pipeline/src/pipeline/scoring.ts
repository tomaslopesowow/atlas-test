import type { KeywordMetrics, SearchIntent } from '../dataforseo/types';

/**
 * How strongly each intent signals buyer / commercial value. The spread is
 * deliberately wide (transactional 3× informational) so intent can outweigh raw
 * volume — a high-volume informational term should not automatically beat a
 * lower-volume commercial one that actually drives demos.
 */
const INTENT_WEIGHT: Record<SearchIntent, number> = {
    transactional: 3,
    commercial: 2,
    informational: 1,
    navigational: 0.5,
};

/** Difficulty assumed for keywords DataForSEO returns no difficulty for. */
const DEFAULT_DIFFICULTY = 50;

export type ScoredKeyword = KeywordMetrics & { score: number };

export type ScoringOptions = {
    /** Drop keywords below this monthly search volume. */
    minVolume: number;
    /** Drop keywords above this organic difficulty (0–100). */
    maxDifficulty: number;
};

/**
 * Scores keywords for "high-intent, low-competition": rewards search volume,
 * buyer intent and commercial value (CPC), penalises ranking difficulty.
 * Keywords missing a difficulty score are treated as mid-difficulty so they
 * neither dominate nor vanish.
 *
 *   score = searchVolume × intentWeight × (1 + ln(1 + cpc)) / max(difficulty, 1)
 *
 * CPC is the best free proxy for commercial value — advertisers only bid on
 * keywords that convert — so a keyword with real CPC is nudged above an
 * equal-volume, equal-intent keyword nobody pays to rank for. The `1 +` keeps
 * zero-CPC keywords in play, and `ln` keeps a few high-CPC terms from
 * dominating. Returns the surviving keywords sorted best-first.
 */
export function scoreKeywords(
    keywords: KeywordMetrics[],
    options: ScoringOptions,
): ScoredKeyword[] {
    return keywords
        .filter((keyword) => keyword.searchVolume >= options.minVolume)
        .filter(
            (keyword) =>
                (keyword.difficulty ?? DEFAULT_DIFFICULTY) <=
                options.maxDifficulty,
        )
        .map((keyword) => {
            const intentWeight =
                INTENT_WEIGHT[keyword.intent ?? 'informational'];
            const difficulty = Math.max(
                keyword.difficulty ?? DEFAULT_DIFFICULTY,
                1,
            );
            const commercialValue =
                1 + Math.log1p(Math.max(keyword.cpc ?? 0, 0));
            const score =
                (keyword.searchVolume * intentWeight * commercialValue) /
                difficulty;
            return { ...keyword, score };
        })
        .sort((a, b) => b.score - a.score);
}

/**
 * Outrankability factor from a competitor's SERP position: a keyword where the
 * best competitor sits at #6 is more winnable than one where they're entrenched
 * at #1 with an authoritative page. Maps rank 1 → 0.5, deeper ranks → ~1.0.
 */
function positionFactor(rank: number): number {
    return 0.5 + 0.5 * (1 - 1 / Math.max(rank, 1));
}

/**
 * Scores competitor-gap keywords for "low competition you can easily outrank":
 * the same volume × intent / difficulty base as {@link scoreKeywords}, then
 * multiplied by an outrankability factor derived from the competitor's SERP
 * position (`rankByKeyword`). Low difficulty remains the primary filter; the
 * position factor is a tiebreaker-strength multiplier, not a dominating term.
 * Defaults to rank 1 (most conservative) when a keyword's rank is unknown.
 */
export function scoreCompetitorKeywords(
    keywords: KeywordMetrics[],
    options: ScoringOptions,
    rankByKeyword: Map<string, number>,
): ScoredKeyword[] {
    return scoreKeywords(keywords, options)
        .map((keyword) => ({
            ...keyword,
            score:
                keyword.score *
                positionFactor(rankByKeyword.get(keyword.keyword) ?? 1),
        }))
        .sort((a, b) => b.score - a.score);
}
