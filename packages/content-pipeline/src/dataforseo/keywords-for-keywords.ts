import type { DataForSeoClient } from './client';
import { deriveIntent, levelToDifficulty } from './intent-heuristics';
import { normalizeCompetitionLevel } from './normalize';
import type { KeywordMetrics } from './types';

const PATH = '/keywords_data/google_ads/keywords_for_keywords/live';

/**
 * Google Ads `keywords_for_keywords` item. Unlike the Labs endpoint, this
 * returns `competition` as a level string (LOW/MEDIUM/HIGH) and provides no
 * keyword difficulty or search intent.
 */
type KeywordsForKeywordsItem = {
    keyword?: string | null;
    search_volume?: number | null;
    competition?: string | null;
    cpc?: number | null;
};

export type KeywordsForKeywordsParams = {
    keywords: string[];
    locationCode: number;
    languageCode: string;
    limit?: number;
};

/**
 * Fetches related keywords via the Google Ads `keywords_for_keywords` endpoint.
 * Used as a fallback when the richer Labs `keyword_ideas` endpoint is
 * unavailable for a location (it currently errors for the Netherlands).
 *
 * Google Ads gives no organic difficulty or search intent, so we derive
 * *heuristic estimates* for both — without them the scorer collapses to a pure
 * volume ranking on the primary market (intent defaults to informational, and
 * a null difficulty passes any `maxDifficulty` filter). These are deliberately
 * coarse stand-ins for the Labs signals, only used on this fallback path:
 * `intent` from buyer/commercial keyword cues, `difficulty` from the paid
 * competition level (LOW/MEDIUM/HIGH → 25/50/75).
 */
export async function fetchKeywordsForKeywords(
    client: DataForSeoClient,
    params: KeywordsForKeywordsParams,
): Promise<{ keywords: KeywordMetrics[]; cost: number }> {
    const { result, cost } = await client.live<KeywordsForKeywordsItem>(PATH, {
        keywords: params.keywords.slice(0, 20),
        location_code: params.locationCode,
        language_code: params.languageCode,
        sort_by: 'search_volume',
    });

    return {
        cost,
        keywords: result
            .filter((item) => !!item?.keyword)
            .map((item) => {
                const keyword = item.keyword as string;
                const competitionLevel = normalizeCompetitionLevel(
                    item.competition,
                );
                return {
                    keyword,
                    searchVolume: item.search_volume ?? 0,
                    competition: null,
                    competitionLevel,
                    cpc: item.cpc ?? null,
                    difficulty: levelToDifficulty(competitionLevel),
                    intent: deriveIntent(keyword),
                };
            })
            .slice(0, params.limit ?? 200),
    };
}
