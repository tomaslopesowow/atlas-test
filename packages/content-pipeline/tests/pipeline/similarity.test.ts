import { describe, expect, it } from 'vitest';
import {
    collapseNearDuplicateClusters,
    jaccard,
} from '../../src/pipeline/similarity';
import { buildKeywordCluster as cluster } from '../support/builders';

describe('jaccard', () => {
    it('is 1 for identical token sets', () => {
        expect(jaccard('alpha bravo charlie', 'alpha bravo charlie')).toBe(1);
    });

    it('is the ratio of shared to total tokens for partial overlap', () => {
        // {alpha,bravo,charlie} vs {bravo,charlie,delta}: 2 shared / 4 union.
        expect(
            jaccard('alpha bravo charlie', 'bravo charlie delta'),
        ).toBeCloseTo(0.5, 6);
    });

    it('is 0 for disjoint token sets', () => {
        expect(jaccard('alpha bravo', 'gamma delta')).toBe(0);
    });

    it('is 0 when either side has no usable tokens', () => {
        // "the and" are stopwords -> empty token set.
        expect(jaccard('the and', 'alpha bravo')).toBe(0);
        expect(jaccard('', 'alpha')).toBe(0);
    });
});

describe('collapseNearDuplicateClusters', () => {
    const clusters = [
        cluster('invoice automation tool', 5),
        cluster('fleet tracking maps', 4),
        cluster('invoice automation system', 3),
    ];

    it('drops a near-duplicate, keeping the earlier (higher-scoring) one', () => {
        const { kept, dropped } = collapseNearDuplicateClusters(clusters);
        expect(kept.map((c) => c.primary.keyword)).toEqual([
            'invoice automation tool',
            'fleet tracking maps',
        ]);
        expect(dropped.map((c) => c.primary.keyword)).toEqual([
            'invoice automation system',
        ]);
    });

    it('respects a custom (stricter) minJaccard threshold', () => {
        // The near-dup pair sits at 0.5; raising the bar above that keeps both.
        const { kept, dropped } = collapseNearDuplicateClusters(clusters, 0.6);
        expect(kept).toHaveLength(3);
        expect(dropped).toHaveLength(0);
    });

    it('keeps everything when nothing overlaps', () => {
        const { kept, dropped } = collapseNearDuplicateClusters([
            cluster('alpha one', 3),
            cluster('bravo two', 2),
        ]);
        expect(kept).toHaveLength(2);
        expect(dropped).toHaveLength(0);
    });
});
