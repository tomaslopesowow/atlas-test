import type { DataForSeoClient } from './client';
import { normalizeCompetitionLevel, normalizeSearchIntent } from './normalize';
import type { KeywordMetrics } from './types';

const PATH = '/dataforseo_labs/google/ranked_keywords/live';

/** Which competitor ranks for a keyword, and at what SERP position. */
export type CompetitorMeta = { domain: string; rank: number };

type RankedItem = {
    keyword_data?: {
        keyword?: string | null;
        keyword_info?: {
            search_volume?: number | null;
            competition?: number | null;
            competition_level?: string | null;
            cpc?: number | null;
        } | null;
        keyword_properties?: { keyword_difficulty?: number | null } | null;
        search_intent_info?: { main_intent?: string | null } | null;
    } | null;
    ranked_serp_element?: {
        serp_item?: {
            rank_group?: number | null;
            rank_absolute?: number | null;
        } | null;
    } | null;
};

type RankedResult = { items?: RankedItem[] | null };

export type RankedKeywordsParams = {
    /** Domain to analyse (protocol / www / path are stripped). */
    target: string;
    locationCode: number;
    languageCode: string;
    /** Max keywords to return (default 200, max 1000). */
    limit?: number;
    /** Server-side filters to cut cost and fit the 1000-row cap. */
    minVolume?: number;
    maxDifficulty?: number;
};

/**
 * Fetches the keywords a domain ranks for (DataForSEO Labs `ranked_keywords`),
 * each as `KeywordMetrics` plus the domain's SERP position (`rankByKeyword`).
 *
 * Difficulty/volume filters are pushed to the API so the returned rows are
 * already the low-difficulty "easy win" candidates rather than the full
 * (often thousands-strong) ranking set — important since this is a costlier,
 * per-domain Labs call capped at 1000 rows.
 *
 * Labs-only: there is no Google Ads equivalent for "what does a domain rank
 * for", so this has no fallback (and currently errors for the Netherlands).
 */
export async function fetchRankedKeywords(
    client: DataForSeoClient,
    params: RankedKeywordsParams,
): Promise<{
    keywords: KeywordMetrics[];
    rankByKeyword: Map<string, number>;
    cost: number;
}> {
    const filters = buildFilters(params.minVolume, params.maxDifficulty);

    const { result, cost } = await client.live<RankedResult>(PATH, {
        target: normalizeDomain(params.target),
        location_code: params.locationCode,
        language_code: params.languageCode,
        limit: params.limit ?? 200,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
        ...(filters ? { filters } : {}),
    });

    const items = result[0]?.items ?? [];
    const keywords: KeywordMetrics[] = [];
    const rankByKeyword = new Map<string, number>();

    for (const item of items) {
        const data = item.keyword_data;
        const keyword = data?.keyword;
        if (!keyword) continue;

        const info = data?.keyword_info ?? {};
        keywords.push({
            keyword,
            searchVolume: info.search_volume ?? 0,
            competition: info.competition ?? null,
            competitionLevel: normalizeCompetitionLevel(info.competition_level),
            cpc: info.cpc ?? null,
            difficulty: data?.keyword_properties?.keyword_difficulty ?? null,
            intent: normalizeSearchIntent(
                data?.search_intent_info?.main_intent,
            ),
        });

        const rank =
            item.ranked_serp_element?.serp_item?.rank_group ??
            item.ranked_serp_element?.serp_item?.rank_absolute;
        if (typeof rank === 'number') rankByKeyword.set(keyword, rank);
    }

    return { keywords, rankByKeyword, cost };
}

/** Builds the DataForSEO `filters` array (conditions joined with `and`). */
function buildFilters(
    minVolume?: number,
    maxDifficulty?: number,
): unknown[] | undefined {
    const conditions: unknown[] = [];
    if (typeof maxDifficulty === 'number') {
        conditions.push([
            'keyword_data.keyword_properties.keyword_difficulty',
            '<=',
            maxDifficulty,
        ]);
    }
    if (typeof minVolume === 'number') {
        conditions.push([
            'keyword_data.keyword_info.search_volume',
            '>=',
            minVolume,
        ]);
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions;
    return [conditions[0], 'and', conditions[1]];
}

function normalizeDomain(target: string): string {
    return target
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
}
