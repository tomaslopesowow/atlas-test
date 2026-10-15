export type SearchIntent =
    | 'informational'
    | 'navigational'
    | 'commercial'
    | 'transactional';

export type CompetitionLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * A keyword enriched with DataForSEO metrics. The `keyword_ideas/live` endpoint
 * returns all of these in a single call, so no separate volume / difficulty /
 * intent requests are needed.
 */
export type KeywordMetrics = {
    keyword: string;
    /** Average monthly searches; 0 when unknown. */
    searchVolume: number;
    /** Paid competition 0–1; null when unknown. */
    competition: number | null;
    competitionLevel: CompetitionLevel | null;
    /** Cost per click in the location's currency; null when unknown. */
    cpc: number | null;
    /** Organic ranking difficulty 0–100; null when unknown. */
    difficulty: number | null;
    /** DataForSEO's classified search intent; null when unknown. */
    intent: SearchIntent | null;
};
