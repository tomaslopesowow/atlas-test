import type { KeywordCluster } from '@repo/content-pipeline/pipeline/clustering';
import type { Payload } from 'payload';

/**
 * Filters out clusters already tracked in `content-pipeline-topics` (in any
 * status — queued, generating, drafted, published or rejected), so a weekly run
 * never re-surfaces a topic an earlier run already handled. Returns only the
 * genuinely new clusters, preserving order.
 *
 * Dedup is keyed on `clusterKey`. The collection also enforces `unique` on that
 * field, so a concurrent run can't create a duplicate even if it races this
 * check.
 */
export async function filterNewClusters(
    payload: Payload,
    clusters: KeywordCluster[],
): Promise<KeywordCluster[]> {
    if (clusters.length === 0) return [];

    // Look up only the candidate keys, selecting just `clusterKey`, instead of
    // loading every topic ever created. Bounds the query to this run's
    // candidates regardless of how large the collection grows over time.
    const existing = await payload.find({
        collection: 'content-pipeline-topics',
        where: { clusterKey: { in: clusters.map((c) => c.clusterKey) } },
        select: { clusterKey: true },
        depth: 0,
        pagination: false,
    });

    const seen = new Set(existing.docs.map((doc) => doc.clusterKey));

    return clusters.filter((cluster) => !seen.has(cluster.clusterKey));
}
