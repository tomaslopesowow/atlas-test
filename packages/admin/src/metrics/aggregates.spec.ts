import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RangeValue, Span } from '../types/types.js';
import { comparedWith, period, unitFor } from './aggregates.js';

// a Friday afternoon, in UTC
const NOW = Date.UTC(2026, 9, 9, 15);

const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;
const days = (span: Span | null) => span && [day(span.from), day(span.to)];

/** The days a range covers and the ones before it, each as [from, to), to the day. */
const spans = (range: RangeValue, now = NOW) => {
    const { current, previous } = period({ range, now });

    return { current: days(current), previous: days(previous) };
};

describe('period', () => {
    it('covers the last days up to the end of today, against as many before', () => {
        assert.deepEqual(spans(30), {
            current: ['2026-09-10', '2026-10-10'],
            previous: ['2026-08-11', '2026-09-10'],
        });
    });

    it('covers today, and the calendar week, month or year, to date, against the one before up to the same moment', () => {
        const until = (range: RangeValue) =>
            period({ range, now: NOW }).previous?.to.toISOString();

        assert.deepEqual(spans('today').current, ['2026-10-09', '2026-10-10']);
        // 3pm today against yesterday until 3pm, not the whole of yesterday
        assert.equal(until('today'), '2026-10-08T15:00:00.000Z');
        assert.deepEqual(spans('week'), {
            current: ['2026-10-05', '2026-10-10'],
            previous: ['2026-09-28', '2026-10-02'],
        });
        assert.equal(until('week'), '2026-10-02T15:00:00.000Z');
        assert.deepEqual(spans('month'), {
            current: ['2026-10-01', '2026-10-10'],
            previous: ['2026-09-01', '2026-09-09'],
        });
        assert.equal(until('month'), '2026-09-09T15:00:00.000Z');
        assert.deepEqual(spans('year'), {
            current: ['2026-01-01', '2026-10-10'],
            previous: ['2025-01-01', '2025-10-09'],
        });
        // a longer month than the one before compares with the whole of it
        assert.deepEqual(spans('month', Date.UTC(2026, 2, 31)).previous, [
            '2026-02-01',
            '2026-03-01',
        ]);
    });

    it('covers a whole year against the one before, and all time against nothing', () => {
        assert.deepEqual(spans('2025'), {
            current: ['2025-01-01', '2026-01-01'],
            previous: ['2024-01-01', '2025-01-01'],
        });
        assert.deepEqual(spans('all'), {
            current: [null, '2026-10-10'],
            previous: null,
        });
    });

    it('covers days picked on a calendar, both included, against as many before', () => {
        assert.deepEqual(spans('2026-10-01..2026-10-09'), {
            current: ['2026-10-01', '2026-10-10'],
            previous: ['2026-09-22', '2026-10-01'],
        });
    });

    it('refuses a range it cannot read', () => {
        for (const range of [
            'soon',
            '30',
            0,
            1.5,
            '2026-10-09..2026-10-01',
            '2026-02-31..2026-03-01',
            // years past those a YEAR takes, whose days before Postgres cannot hold
            '1900-01-01..9999-12-30',
            '0001-01-01..2026-01-01',
        ])
            assert.throws(() => period({ range, now: NOW }), /No period/);
    });
});

describe('comparedWith', () => {
    it('names the span a range is compared with', () => {
        assert.deepEqual(
            [
                1,
                30,
                'today',
                'week',
                'month',
                'year',
                '2025',
                '2026-10-01..2026-10-09',
                'all',
            ].map(comparedWith),
            [
                'yesterday',
                'the 30 days before',
                'yesterday',
                'last week',
                'last month',
                'last year',
                '2024',
                'the days before',
                undefined,
            ],
        );
    });
});

describe('unitFor', () => {
    it('picks a unit that keeps a trend to a readable number of bars', () => {
        assert.deepEqual([1, 31, 32, 183, 184, 731, 732].map(unitFor), [
            'day',
            'day',
            'week',
            'week',
            'month',
            'month',
            'year',
        ]);
    });
});
