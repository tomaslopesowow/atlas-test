import type { ScoredKeyword } from './scoring';
import { extractMeaningfulTerms, normalizeSearchText } from './text-utils';

export type KeywordCluster = {
    /** Stable dedup identifier — the cluster's primary keyword, normalized. */
    clusterKey: string;
    /** The highest-scoring keyword; used as the topic seed. */
    primary: ScoredKeyword;
    /** All keywords in the cluster, best first. */
    keywords: ScoredKeyword[];
    /** Sum of member scores — ranks clusters against each other. */
    score: number;
};

export type ClusteringOptions = {
    /**
     * A token appearing in more than this fraction of keywords is treated as
     * generic (e.g. "management", "software") and never, on its own, merges two
     * keywords. Lower = tighter, more topical clusters.
     */
    maxDocFreqRatio?: number;
};

type WorkingCluster = KeywordCluster & {
    primaryTerms: Set<string>;
};

/**
 * Groups scored keywords into topic clusters by shared *distinctive* tokens — a
 * free, deterministic alternative to SERP-overlap clustering (which would cost
 * one SERP call per keyword).
 *
 * The key idea is document frequency: a token's genericness is measured against
 * the actual keyword set rather than a fixed list. Tokens that appear in a large
 * share of keywords ("management", "software", "order" for an order-management
 * seed) are generic and can't merge unrelated keywords; only low-frequency,
 * distinctive tokens ("po", "invoice", "fleet", "supplier") form clusters. This
 * prevents the over-merge where a single common token collapsed dozens of
 * unrelated keywords into one topic.
 *
 * Keywords arrive sorted best-first; each keyword joins the first cluster whose
 * primary shares a distinctive token, otherwise it seeds a new cluster — so each
 * cluster's primary is its highest-scoring member. Matching is against the
 * primary's tokens only (not the growing membership), which avoids transitive
 * chain-merging.
 */
export function clusterKeywords(
    keywords: ScoredKeyword[],
    options: ClusteringOptions = {},
): KeywordCluster[] {
    const maxDocFreqRatio = options.maxDocFreqRatio ?? 0.3;
    const total = keywords.length || 1;

    // Document frequency: how many keywords each token appears in.
    const docFreq = new Map<string, number>();
    for (const keyword of keywords) {
        for (const term of new Set(extractMeaningfulTerms(keyword.keyword))) {
            docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
        }
    }

    const distinctiveTerms = (keyword: string): string[] =>
        extractMeaningfulTerms(keyword).filter(
            (term) => (docFreq.get(term) ?? 0) / total <= maxDocFreqRatio,
        );

    const clusters: WorkingCluster[] = [];

    for (const keyword of keywords) {
        const terms = distinctiveTerms(keyword.keyword);

        const match = terms.length
            ? clusters.find((cluster) =>
                  terms.some((term) => cluster.primaryTerms.has(term)),
              )
            : undefined;

        if (match) {
            match.keywords.push(keyword);
            match.score += keyword.score;
        } else {
            clusters.push({
                clusterKey: normalizeSearchText(keyword.keyword),
                primary: keyword,
                keywords: [keyword],
                score: keyword.score,
                primaryTerms: new Set(terms),
            });
        }
    }

    return clusters
        .map(({ primaryTerms: _primaryTerms, ...cluster }) => cluster)
        .sort((a, b) => b.score - a.score);
}
