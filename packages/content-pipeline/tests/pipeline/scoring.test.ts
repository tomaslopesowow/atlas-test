import { describe, expect, it } from 'vitest';
import {
    scoreCompetitorKeywords,
    scoreKeywords,
} from '../../src/pipeline/scoring';
import { buildKeywordMetrics as kw } from '../support/builders';

const opts = { minVolume: 100, maxDifficulty: 60 };

describe('scoreKeywords', () => {
    it('drops keywords below the minimum search volume', () => {
        const out = scoreKeywords(
            [
                kw({ keyword: 'too quiet', searchVolume: 50 }),
                kw({ keyword: 'loud enough', searchVolume: 150 }),
            ],
            opts,
        );
        expect(out.map((k) => k.keyword)).toEqual(['loud enough']);
    });

    it('drops keywords above maxDifficulty', () => {
        const out = scoreKeywords(
            [
                kw({ keyword: 'easy', searchVolume: 500, difficulty: 30 }),
                kw({ keyword: 'hard', searchVolume: 500, difficulty: 75 }),
            ],
            opts,
        );
        expect(out.map((k) => k.keyword)).toEqual(['easy']);
    });

    it('treats a null difficulty as mid (50) for the maxDifficulty filter', () => {
        // The Tier 2 #10 fix: a HIGH-competition fallback keyword now carries
        // difficulty 75 and is filtered at maxDifficulty 60, where a null would
        // have slipped through as a pure-volume term.
        const filtered = scoreKeywords(
            [kw({ keyword: 'high', searchVolume: 9000, difficulty: 75 })],
            opts,
        );
        expect(filtered).toHaveLength(0);

        // A null difficulty is treated as 50 (<= 60) and survives.
        const kept = scoreKeywords(
            [kw({ keyword: 'unknown', searchVolume: 9000, difficulty: null })],
            opts,
        );
        expect(kept).toHaveLength(1);
    });

    it('computes score = volume × intentWeight × (1+ln(1+cpc)) / max(difficulty,1)', () => {
        const [k] = scoreKeywords(
            [
                kw({
                    keyword: 'x',
                    searchVolume: 1000,
                    intent: 'commercial', // weight 2
                    cpc: 0,
                    difficulty: 50,
                }),
            ],
            opts,
        );
        // 1000 * 2 * (1 + ln(1)) / 50 = 40
        expect(k.score).toBeCloseTo(40, 5);
    });

    it('lets a high-intent term beat a higher-volume informational one', () => {
        const out = scoreKeywords(
            [
                kw({
                    keyword: 'guide',
                    searchVolume: 2000,
                    intent: 'informational', // weight 1
                    difficulty: 50,
                }),
                kw({
                    keyword: 'pricing',
                    searchVolume: 800,
                    intent: 'transactional', // weight 3
                    difficulty: 50,
                }),
            ],
            opts,
        );
        // 800*3=2400 beats 2000*1=2000 despite lower volume.
        expect(out[0].keyword).toBe('pricing');
    });

    it('dampens CPC logarithmically so a huge bid does not dominate', () => {
        const [k] = scoreKeywords(
            [kw({ keyword: 'c', searchVolume: 100, cpc: 100, difficulty: 50 })],
            opts,
        );
        // commercialValue = 1 + ln(101) ≈ 5.615; score ≈ 100*1*5.615/50 ≈ 11.2
        expect(k.score).toBeCloseTo((100 * (1 + Math.log1p(100))) / 50, 5);
    });

    it('returns results sorted best-first', () => {
        const out = scoreKeywords(
            [
                kw({ keyword: 'low', searchVolume: 200, difficulty: 50 }),
                kw({ keyword: 'high', searchVolume: 2000, difficulty: 50 }),
                kw({ keyword: 'mid', searchVolume: 800, difficulty: 50 }),
            ],
            opts,
        );
        expect(out.map((k) => k.keyword)).toEqual(['high', 'mid', 'low']);
    });

    it('defaults a null intent to informational (weight 1)', () => {
        const [k] = scoreKeywords(
            [
                kw({
                    keyword: 'n',
                    searchVolume: 100,
                    intent: null,
                    difficulty: 50,
                }),
            ],
            opts,
        );
        expect(k.score).toBeCloseTo((100 * 1) / 50, 5);
    });
});

describe('scoreCompetitorKeywords', () => {
    const base = kw({
        keyword: 'order software',
        searchVolume: 1000,
        intent: 'commercial',
        difficulty: 50,
    });

    it('weights an entrenched #1 competitor lower than a beatable deep rank', () => {
        const rank1 = scoreCompetitorKeywords(
            [base],
            opts,
            new Map([['order software', 1]]),
        );
        const rank10 = scoreCompetitorKeywords(
            [base],
            opts,
            new Map([['order software', 10]]),
        );
        // positionFactor: rank 1 -> 0.5, rank 10 -> 0.95.
        expect(rank10[0].score).toBeGreaterThan(rank1[0].score);
        expect(rank1[0].score).toBeCloseTo(rank10[0].score * (0.5 / 0.95), 4);
    });

    it('defaults to the most conservative rank (1) when rank is unknown', () => {
        const unknown = scoreCompetitorKeywords([base], opts, new Map());
        const rank1 = scoreCompetitorKeywords(
            [base],
            opts,
            new Map([['order software', 1]]),
        );
        expect(unknown[0].score).toBeCloseTo(rank1[0].score, 6);
    });
});
