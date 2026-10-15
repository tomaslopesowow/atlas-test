import type { KeywordCluster } from './clustering';
import { extractMeaningfulTerms } from './text-utils';

/**
 * Lexical similarity for the near-duplicate gate's cheap, deterministic first
 * tier (Tier 1). Reuses the same term extraction as clustering, so the overlap
 * is measured on exactly the tokens clusterKeys are formed from.
 *
 * Jaccard (token-set overlap) is used rather than TF-cosine: keyword and title
 * strings are only 3–8 tokens long, so term frequency carries no signal and a
 * cosine would collapse to ~Jaccard with more code.
 */

/**
 * Below this, a candidate cluster's primary keyword is considered a near-dup of
 * an already-kept cluster *within the same run* and dropped (keeping the
 * higher-scoring one). Tighter than the shortlist gate because intra-run pairs
 * are same-language and same-research.
 */
export const INTRA_RUN_MIN_JACCARD = 0.5;

/**
 * The loose recall threshold for letting an existing topic/post *into* the LLM
 * judge's shortlist. Deliberately low — this gates entry to the judge, not the
 * final drop decision, so it favours recall over precision.
 */
export const SHORTLIST_MIN_JACCARD = 0.18;

/** Max shortlist rows handed to the judge — bounds the prompt as the corpus grows. */
export const SHORTLIST_TOP_N = 5;

/**
 * At or above this Jaccard between a candidate's primary keyword and an existing
 * item's keyphrase, the candidate is auto-classified a `duplicate` *without*
 * consulting the LLM judge. Set high enough that it only fires on token-set
 * equality (reordered/reversed phrasings like "cash to order" vs "order to
 * cash", or a single added stopword), where the judge adds risk, not value —
 * it once ruled exactly that pair `distinct`. The judge still handles the
 * fuzzier middle ground below this line.
 */
export const AUTO_DUPLICATE_MIN_JACCARD = 0.9;

/**
 * Jaccard similarity of two strings' token sets: |A∩B| / |A∪B|, in [0, 1].
 * Returns 0 when either side has no tokens (an empty set can't be "similar").
 */
export function jaccard(a: string, b: string): number {
    const setA = new Set(extractMeaningfulTerms(a));
    const setB = new Set(extractMeaningfulTerms(b));
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

/**
 * Collapses near-identical candidate clusters *within a single run*. Clusters
 * arrive sorted best-first (clusterKeywords sorts by score desc); a cluster is
 * dropped when its primary keyword's Jaccard against an already-kept cluster's
 * primary is ≥ `minJaccard`, so the highest-scoring member of each near-dup set
 * survives. Order is preserved. Pure — no I/O.
 */
export function collapseNearDuplicateClusters(
    clusters: KeywordCluster[],
    minJaccard: number = INTRA_RUN_MIN_JACCARD,
): { kept: KeywordCluster[]; dropped: KeywordCluster[] } {
    const kept: KeywordCluster[] = [];
    const dropped: KeywordCluster[] = [];

    for (const cluster of clusters) {
        const isNearDup = kept.some(
            (k) =>
                jaccard(cluster.primary.keyword, k.primary.keyword) >=
                minJaccard,
        );
        if (isNearDup) dropped.push(cluster);
        else kept.push(cluster);
    }

    return { kept, dropped };
}
