import { describe, expect, it } from 'vitest';
import { isoWeek } from '../../src/pipeline/iso-week';

describe('isoWeek', () => {
    it('formats as YYYY-Www with a zero-padded week', () => {
        // 2026-01-01 is a Thursday -> ISO week 1 of 2026.
        expect(isoWeek(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
        expect(isoWeek(new Date('2026-01-01T00:00:00Z'))).toMatch(
            /^\d{4}-W\d{2}$/,
        );
    });

    it('handles a 53-week year (late December)', () => {
        // 2026 starts on a Thursday, so it is an ISO long year (W53).
        expect(isoWeek(new Date('2026-12-31T00:00:00Z'))).toBe('2026-W53');
    });

    it('attributes early January to the previous ISO year when appropriate', () => {
        // 2023-01-01 is a Sunday -> belongs to 2022-W52.
        expect(isoWeek(new Date('2023-01-01T00:00:00Z'))).toBe('2022-W52');
    });

    it('handles a leap day and ignores the time of day', () => {
        expect(isoWeek(new Date('2024-02-29T12:34:56Z'))).toBe('2024-W09');
        expect(isoWeek(new Date('2024-02-29T00:00:00Z'))).toBe('2024-W09');
    });

    it('is deterministic for the same input', () => {
        const d = new Date('2026-06-08T00:00:00Z');
        expect(isoWeek(d)).toBe(isoWeek(d));
    });
});
