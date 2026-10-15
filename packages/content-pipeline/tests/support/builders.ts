import type { KeywordMetrics } from '../../src/dataforseo/types';
import type { KeywordCluster } from '../../src/pipeline/clustering';
import type { ScoredKeyword } from '../../src/pipeline/scoring';

export function buildKeywordMetrics(
    overrides: Partial<KeywordMetrics> = {},
): KeywordMetrics {
    return {
        keyword: 'order management',
        searchVolume: 1000,
        competition: null,
        competitionLevel: null,
        cpc: null,
        difficulty: null,
        intent: null,
        ...overrides,
    };
}

export function buildScoredKeyword(
    overrides: Partial<ScoredKeyword> = {},
): ScoredKeyword {
    return {
        ...buildKeywordMetrics(overrides),
        score: overrides.score ?? 1,
    };
}

export function buildKeywordCluster(
    primaryKeyword: string,
    score = 1,
): KeywordCluster {
    const primary = buildScoredKeyword({
        keyword: primaryKeyword,
        score,
    });
    return {
        clusterKey: primaryKeyword.toLowerCase(),
        primary,
        keywords: [primary],
        score,
    };
}
