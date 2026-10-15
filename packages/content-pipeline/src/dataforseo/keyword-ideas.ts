import type { DataForSeoClient } from './client';
import { normalizeCompetitionLevel, normalizeSearchIntent } from './normalize';
import type { KeywordMetrics } from './types';

const PATH = '/dataforseo_labs/google/keyword_ideas/live';

type KeywordIdeasItem = {
    keyword?: string | null;
    keyword_info?: {
        search_volume?: number | null;
        competition?: number | null;
        competition_level?: string | null;
        cpc?: number | null;
    } | null;
    keyword_properties?: { keyword_difficulty?: number | null } | null;
    search_intent_info?: { main_intent?: string | null } | null;
};

type KeywordIdeasResult = { items?: KeywordIdeasItem[] | null };

export type KeywordIdeasParams = {
    /** Seed keywords (max 200). */
    keywords: string[];
    /** DataForSEO location code (e.g. 2528 = Netherlands, 2840 = United States). */
    locationCode: number;
    /** DataForSEO language code (e.g. 'nl', 'en'). */
    languageCode: string;
    /** Max ideas to return (default 200, max 1000). */
    limit?: number;
};

/**
 * Fetches related keyword ideas for the seed terms, each enriched with search
 * volume, paid competition, CPC, organic difficulty and search intent — all in
 * a single call. (Verified against the live API: `keyword_ideas/live` bundles
 * `keyword_info`, `keyword_properties.keyword_difficulty` and
 * `search_intent_info.main_intent`, so no separate volume / difficulty / intent
 * requests are required.)
 */
export async function fetchKeywordIdeas(
    client: DataForSeoClient,
    params: KeywordIdeasParams,
): Promise<{ keywords: KeywordMetrics[]; cost: number }> {
    const { result, cost } = await client.live<KeywordIdeasResult>(PATH, {
        keywords: params.keywords.slice(0, 200),
        location_code: params.locationCode,
        language_code: params.languageCode,
        limit: params.limit ?? 200,
        // Most relevant ideas first.
        order_by: ['relevance,desc'],
    });

    const items = result[0]?.items ?? [];

    return {
        cost,
        keywords: items
            .map(toMetrics)
            .filter((keyword) => keyword.keyword.length > 0),
    };
}

function toMetrics(item: KeywordIdeasItem): KeywordMetrics {
    const info = item.keyword_info ?? {};
    return {
        keyword: item.keyword ?? '',
        searchVolume: info.search_volume ?? 0,
        competition: info.competition ?? null,
        competitionLevel: normalizeCompetitionLevel(info.competition_level),
        cpc: info.cpc ?? null,
        difficulty: item.keyword_properties?.keyword_difficulty ?? null,
        intent: normalizeSearchIntent(item.search_intent_info?.main_intent),
    };
}
