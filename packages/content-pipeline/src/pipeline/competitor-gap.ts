import type { DataForSeoClient } from '../dataforseo/client';
import {
    type CompetitorMeta,
    fetchRankedKeywords,
} from '../dataforseo/ranked-keywords';
import type { KeywordMetrics } from '../dataforseo/types';

/** A keyword we already rank for at this position or better is not a "gap". */
const OWN_RANK_TOP = 10;

export type CompetitorGapParams = {
    competitorDomains: string[];
    /** Our own domain — keywords we already rank for in the top results are excluded. */
    ownDomain?: string;
    locationCode: number;
    languageCode: string;
    minVolume: number;
    maxDifficulty: number;
    /** Max keywords pulled per competitor domain. */
    limitPerDomain?: number;
    /** Called per failing domain so one bad/unavailable domain doesn't abort the run. */
    onError?: (domain: string, message: string) => void;
};

/**
 * Builds the competitor content gap: the low-difficulty keywords competitors
 * rank for that we don't already rank for.
 *
 * For each competitor domain it pulls their (difficulty-filtered) ranked
 * keywords and merges them, keeping the *best* (lowest) competitor rank per
 * keyword as the bar to beat. When `ownDomain` is set, it then fetches our own
 * rankings once and drops any keyword we already rank for in the top results —
 * the actual content gap. Each competitor domain is fetched in its own
 * try/catch so a single unavailable domain (e.g. the NL Labs outage) doesn't
 * abort the rest.
 */
export async function gatherCompetitorGapKeywords(
    client: DataForSeoClient,
    params: CompetitorGapParams,
): Promise<{
    keywords: KeywordMetrics[];
    metaByKeyword: Map<string, CompetitorMeta>;
    cost: number;
}> {
    const merged = new Map<
        string,
        { metrics: KeywordMetrics; meta: CompetitorMeta }
    >();
    let cost = 0;

    for (const domain of params.competitorDomains) {
        try {
            const {
                keywords,
                rankByKeyword,
                cost: domainCost,
            } = await fetchRankedKeywords(client, {
                target: domain,
                locationCode: params.locationCode,
                languageCode: params.languageCode,
                limit: params.limitPerDomain ?? 200,
                minVolume: params.minVolume,
                maxDifficulty: params.maxDifficulty,
            });
            cost += domainCost;

            for (const keyword of keywords) {
                const rank = rankByKeyword.get(keyword.keyword);
                const meta: CompetitorMeta = {
                    domain,
                    rank: typeof rank === 'number' ? rank : 50,
                };
                const existing = merged.get(keyword.keyword);
                // Keep the toughest competitor (lowest rank) as the bar to beat.
                if (!existing || meta.rank < existing.meta.rank) {
                    merged.set(keyword.keyword, { metrics: keyword, meta });
                }
            }
        } catch (error) {
            params.onError?.(
                domain,
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    // Content gap: drop keywords we already rank for in the top results.
    if (params.ownDomain) {
        try {
            const { rankByKeyword, cost: ownCost } = await fetchRankedKeywords(
                client,
                {
                    target: params.ownDomain,
                    locationCode: params.locationCode,
                    languageCode: params.languageCode,
                    limit: 1000,
                },
            );
            cost += ownCost;
            for (const [keyword, rank] of rankByKeyword) {
                if (rank <= OWN_RANK_TOP) merged.delete(keyword);
            }
        } catch (error) {
            params.onError?.(
                params.ownDomain,
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    const keywords: KeywordMetrics[] = [];
    const metaByKeyword = new Map<string, CompetitorMeta>();
    for (const [keyword, entry] of merged) {
        keywords.push(entry.metrics);
        metaByKeyword.set(keyword, entry.meta);
    }

    return { keywords, metaByKeyword, cost };
}
