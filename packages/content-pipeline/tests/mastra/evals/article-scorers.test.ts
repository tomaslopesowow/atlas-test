import { describe, expect, it } from 'vitest';
import {
    countStatistics,
    firstParagraphAfterFirstHeading,
    hasHardFlag,
    isStructurallyTooShort,
    MIN_DRAFT_SCORE,
    scoreArticleQuality,
} from '../../../src/mastra/evals/article-scorers';

/**
 * Builds a Markdown body with a controllable word count, heading count, number
 * of internal links, and the keyword text guaranteed present. Defaults are
 * GEO-complete (answer-first paragraph under the first heading, an external
 * citation, and ≥3 statistics) so a default body still scores 100.
 */
function makeBody({
    fillerWords = 1600,
    headings = 5,
    internalLinks = 2,
    keywordText = 'orderbeheer',
    answerWords = 45,
    withStats = true,
    externalLinks = 1,
}: {
    fillerWords?: number;
    headings?: number;
    internalLinks?: number;
    keywordText?: string;
    answerWords?: number;
    withStats?: boolean;
    externalLinks?: number;
} = {}): string {
    const answer =
        answerWords > 0 ? Array(answerWords).fill('antwoord').join(' ') : '';
    const stats = withStats
        ? 'Gartner meldt 40% minder fouten, 1.500 orders per dag en €2.000 besparing.'
        : '';
    const external = Array.from(
        { length: externalLinks },
        (_, i) => `[bron ${i}](https://idc.com/report/${i})`,
    ).join(' ');
    const internal = Array.from(
        { length: internalLinks },
        (_, i) => `[read more ${i}](/blog/post-${i})`,
    ).join(' ');
    const extraHeadings = Array.from(
        { length: Math.max(headings - 1, 0) },
        (_, i) => `## Section ${i + 2}`,
    );
    const filler = Array(fillerWords).fill('woord').join(' ');
    return [
        '## Section 1',
        answer,
        keywordText,
        stats,
        external,
        internal,
        ...extraHeadings,
        filler,
    ]
        .filter(Boolean)
        .join('\n\n');
}

const brief = { primaryKeyword: 'orderbeheer', secondaryKeywords: [] };

describe('scoreArticleQuality', () => {
    it('scores a long, well-structured, on-topic, linked article ~100 with no flags', () => {
        const q = scoreArticleQuality(makeBody(), brief);
        expect(q.score).toBe(100);
        expect(q.flags).toEqual([]);
        expect(q.keywordCoverage).toBe(1);
        expect(q.score).toBeGreaterThanOrEqual(MIN_DRAFT_SCORE);
    });

    it('does not penalise missing internal links when they are not expected', () => {
        const body = makeBody({ internalLinks: 0 });

        const expected = scoreArticleQuality(body, brief); // default: expect links
        expect(expected.score).toBe(85); // link weight (15) lost
        expect(expected.flags).toContain('No internal links.');

        const notExpected = scoreArticleQuality(body, brief, {
            expectInternalLinks: false,
        });
        expect(notExpected.score).toBe(100); // weight renormalised
        expect(notExpected.flags).not.toContain('No internal links.');
    });

    it('flags a short body without making it a hard fail above 300 words', () => {
        const q = scoreArticleQuality(makeBody({ fillerWords: 500 }), brief);
        expect(q.flags.some((f) => f.startsWith('Short ('))).toBe(true);
        expect(hasHardFlag(q)).toBe(false);
    });

    it('flags too few sections', () => {
        const q = scoreArticleQuality(makeBody({ headings: 1 }), brief);
        expect(q.flags.some((f) => f.startsWith('Few sections ('))).toBe(true);
    });

    it('hard-flags a missing primary keyword', () => {
        const q = scoreArticleQuality(
            makeBody({ keywordText: 'something else entirely' }),
            brief,
        );
        expect(q.flags).toContain('Primary keyword missing from body.');
        expect(hasHardFlag(q)).toBe(true);
    });

    it('counts only H2/H3 headings, not H1 or H4', () => {
        const body = [
            '# Title (h1)',
            '## Real section',
            '### Sub section',
            '#### Too deep (h4)',
            'orderbeheer body text',
        ].join('\n\n');
        expect(scoreArticleQuality(body, brief).headingCount).toBe(2);
    });

    it('counts only relative-URL internal links', () => {
        const body = [
            '## Section',
            'See [internal](/blog/x) and [external](https://example.com).',
            'orderbeheer body text',
        ].join('\n\n');
        expect(scoreArticleQuality(body, brief).internalLinkCount).toBe(1);
    });

    it('measures keyword coverage across primary + secondary keywords', () => {
        const q = scoreArticleQuality('orderbeheer software guide', {
            primaryKeyword: 'orderbeheer',
            secondaryKeywords: ['logistiek', 'voorraad'],
        });
        // 1 of 3 keywords present.
        expect(q.keywordCoverage).toBeCloseTo(1 / 3, 6);
    });

    it('accepts a GEO-complete body with no flags', () => {
        const q = scoreArticleQuality(makeBody(), brief);
        expect(q.answerFirst).toBe(true);
        expect(q.externalLinkCount).toBe(1);
        expect(q.statisticCount).toBe(3);
        expect(q.flags).toEqual([]);
    });

    it('flags a missing answer-first opening without hard-failing', () => {
        const q = scoreArticleQuality(makeBody({ answerWords: 10 }), brief);
        expect(q.answerFirst).toBe(false);
        expect(q.flags).toContain('No answer-first opening.');
        expect(q.score).toBe(95); // only the 5-point answer-first weight lost
        expect(q.score).toBeGreaterThanOrEqual(MIN_DRAFT_SCORE);
        expect(hasHardFlag(q)).toBe(false);
    });

    it('treats a body opening with a list as having no answer-first paragraph', () => {
        const body = [
            '## Section',
            '- bullet one',
            '- bullet two',
            'orderbeheer body text',
        ].join('\n\n');
        expect(scoreArticleQuality(body, brief).answerFirst).toBe(false);
    });

    it('flags missing external citations and counts only absolute links', () => {
        const q = scoreArticleQuality(makeBody({ externalLinks: 0 }), brief);
        expect(q.externalLinkCount).toBe(0);
        expect(q.flags).toContain('No external citations.');
    });

    it('flags too few statistics', () => {
        const q = scoreArticleQuality(makeBody({ withStats: false }), brief);
        expect(q.statisticCount).toBe(0);
        expect(q.flags.some((f) => f.startsWith('Few statistics ('))).toBe(
            true,
        );
    });

    it('keeps an otherwise-strong but GEO-less article above the floor', () => {
        const q = scoreArticleQuality(
            makeBody({ answerWords: 10, withStats: false, externalLinks: 0 }),
            brief,
        );
        expect(q.score).toBe(85); // all 15 GEO points lost, nothing else
        expect(q.score).toBeGreaterThanOrEqual(MIN_DRAFT_SCORE);
        expect(hasHardFlag(q)).toBe(false);
        expect(q.flags).toEqual([
            'No answer-first opening.',
            'No external citations.',
            'Few statistics (0 found).',
        ]);
    });
});

describe('firstParagraphAfterFirstHeading', () => {
    it('returns the plain paragraph directly under the first heading', () => {
        const md = '## Heading\n\nThis is the answer paragraph.\n\nMore body.';
        expect(firstParagraphAfterFirstHeading(md)).toBe(
            'This is the answer paragraph.',
        );
    });

    it('joins a multi-line paragraph into one string', () => {
        const md = '## Heading\n\nLine one\nline two\n\nrest';
        expect(firstParagraphAfterFirstHeading(md)).toBe('Line one line two');
    });

    it('returns null when the section opens with a list', () => {
        const md = '## Heading\n\n- first item\n- second item';
        expect(firstParagraphAfterFirstHeading(md)).toBeNull();
    });

    it('returns null when the section opens with another heading', () => {
        const md = '## Heading\n\n### Subheading\n\nbody';
        expect(firstParagraphAfterFirstHeading(md)).toBeNull();
    });

    it('returns null when there is no heading at all', () => {
        expect(
            firstParagraphAfterFirstHeading('just prose, no heading'),
        ).toBeNull();
    });
});

describe('countStatistics', () => {
    it('counts percentages, currency, and thousands-separated numbers once each', () => {
        const md =
            'Gartner meldt 40% minder fouten, 3,5% groei, 1.500 orders, 1,500 items en €2.000 besparing.';
        // 40%, 3,5%, 1.500, 1,500, €2.000 → 5 distinct tokens.
        expect(countStatistics(md)).toBe(5);
    });

    it('excludes bare calendar years', () => {
        expect(countStatistics('Sinds 2026 is alles anders.')).toBe(0);
    });

    it('ignores digits inside link URLs and code spans', () => {
        const md =
            'See the [report](https://example.com/2024/stats-500) and run `port 8080`.';
        expect(countStatistics(md)).toBe(0);
    });

    it('deduplicates a repeated statistic', () => {
        expect(countStatistics('40% here and 40% there.')).toBe(1);
    });
});

describe('hasHardFlag', () => {
    it('is true for a body under 300 words', () => {
        expect(
            hasHardFlag(
                scoreArticleQuality(makeBody({ fillerWords: 50 }), brief),
            ),
        ).toBe(true);
    });

    it('is false for a healthy article', () => {
        expect(hasHardFlag(scoreArticleQuality(makeBody(), brief))).toBe(false);
    });
});

describe('isStructurallyTooShort', () => {
    it('is true only below the 300-word hard floor', () => {
        expect(
            isStructurallyTooShort(
                scoreArticleQuality(makeBody({ fillerWords: 50 }), brief),
            ),
        ).toBe(true);
        expect(
            isStructurallyTooShort(
                scoreArticleQuality(makeBody({ fillerWords: 500 }), brief),
            ),
        ).toBe(false);
    });
});
