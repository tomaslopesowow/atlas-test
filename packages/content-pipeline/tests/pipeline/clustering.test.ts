import { describe, expect, it } from 'vitest';
import { clusterKeywords } from '../../src/pipeline/clustering';
import { buildScoredKeyword as scored } from '../support/builders';

describe('clusterKeywords', () => {
    it('returns an empty array for no keywords', () => {
        expect(clusterKeywords([])).toEqual([]);
    });

    it('merges keywords sharing a distinctive token and sums their score', () => {
        // maxDocFreqRatio 1 makes every token distinctive, isolating the
        // "shared token merges" behaviour from the doc-frequency logic.
        const clusters = clusterKeywords(
            [
                scored({ keyword: 'invoice automation', score: 5 }),
                scored({ keyword: 'fleet tracking', score: 4 }),
                scored({ keyword: 'invoice scanning', score: 3 }),
            ],
            { maxDocFreqRatio: 1 },
        );

        expect(clusters).toHaveLength(2);
        // Best-first: the invoice cluster (5 + 3 = 8) outranks fleet (4).
        expect(clusters[0].primary.keyword).toBe('invoice automation');
        expect(clusters[0].keywords.map((k) => k.keyword)).toEqual([
            'invoice automation',
            'invoice scanning',
        ]);
        expect(clusters[0].score).toBe(8);
        expect(clusters[0].clusterKey).toBe('invoice automation');
        expect(clusters[1].primary.keyword).toBe('fleet tracking');
    });

    it('does not merge on a generic (high doc-frequency) token', () => {
        // "software" appears in every keyword (ratio 1.0 > 0.3 default), so it
        // is generic and can't merge; each distinctive token stands alone.
        const clusters = clusterKeywords([
            scored({ keyword: 'invoice software', score: 4 }),
            scored({ keyword: 'fleet software', score: 3 }),
            scored({ keyword: 'supplier software', score: 2 }),
            scored({ keyword: 'catalog software', score: 1 }),
        ]);
        expect(clusters).toHaveLength(4);
    });

    it('sorts clusters by aggregate score, best-first', () => {
        const clusters = clusterKeywords([
            scored({ keyword: 'alpha one', score: 1 }),
            scored({ keyword: 'bravo two', score: 9 }),
            scored({ keyword: 'charlie three', score: 5 }),
        ]);
        expect(clusters.map((c) => c.score)).toEqual([9, 5, 1]);
    });

    it('still produces a cluster for a keyword with no distinctive tokens', () => {
        // "the best" is entirely stopwords -> no tokens -> seeds its own cluster.
        const clusters = clusterKeywords([
            scored({ keyword: 'the best', score: 1 }),
        ]);
        expect(clusters).toHaveLength(1);
        expect(clusters[0].primary.keyword).toBe('the best');
    });
});
