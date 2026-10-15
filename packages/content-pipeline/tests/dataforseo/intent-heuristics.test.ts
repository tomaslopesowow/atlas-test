import { describe, expect, it } from 'vitest';
import {
    deriveIntent,
    levelToDifficulty,
} from '../../src/dataforseo/intent-heuristics';
import { normalizeCompetitionLevel } from '../../src/dataforseo/normalize';

describe('deriveIntent', () => {
    it('classifies Dutch buyer cues as transactional', () => {
        for (const keyword of [
            'ordersoftware prijs',
            'erp systeem kopen',
            'order management kosten',
            'orderbeheer demo aanvragen',
            'logistiek abonnement',
        ]) {
            expect(deriveIntent(keyword)).toBe('transactional');
        }
    });

    it('classifies English buyer cues as transactional', () => {
        for (const keyword of [
            'order management pricing',
            'order software cost',
            'buy erp system',
            'book a demo',
        ]) {
            expect(deriveIntent(keyword)).toBe('transactional');
        }
    });

    it('classifies evaluation/comparison cues as commercial', () => {
        for (const keyword of [
            'beste order software',
            'order management software',
            'erp systeem vergelijken',
            'sap vs oracle',
            'order tool review',
        ]) {
            expect(deriveIntent(keyword)).toBe('commercial');
        }
    });

    it('falls back to informational for plain how/what queries', () => {
        for (const keyword of [
            'wat is orderbeheer',
            'how to process orders',
            'order entry workflow explained',
        ]) {
            expect(deriveIntent(keyword)).toBe('informational');
        }
    });

    it('prefers transactional over commercial when both cues are present', () => {
        // "software" (commercial) + "prijs" (transactional) -> transactional wins.
        expect(deriveIntent('beste order software prijs')).toBe(
            'transactional',
        );
    });

    it('matches cues case-insensitively', () => {
        expect(deriveIntent('Order Software PRICE')).toBe('transactional');
    });
});

describe('levelToDifficulty', () => {
    it('maps competition levels to a difficulty proxy', () => {
        expect(levelToDifficulty('LOW')).toBe(25);
        expect(levelToDifficulty('MEDIUM')).toBe(50);
        expect(levelToDifficulty('HIGH')).toBe(75);
    });

    it('returns null for unknown competition so the scorer default applies', () => {
        expect(levelToDifficulty(null)).toBeNull();
    });
});

describe('normalizeCompetitionLevel', () => {
    it('passes through valid levels', () => {
        expect(normalizeCompetitionLevel('LOW')).toBe('LOW');
        expect(normalizeCompetitionLevel('MEDIUM')).toBe('MEDIUM');
        expect(normalizeCompetitionLevel('HIGH')).toBe('HIGH');
    });

    it('returns null for empty, lowercase or unexpected values', () => {
        expect(normalizeCompetitionLevel(null)).toBeNull();
        expect(normalizeCompetitionLevel(undefined)).toBeNull();
        expect(normalizeCompetitionLevel('')).toBeNull();
        expect(normalizeCompetitionLevel('low')).toBeNull();
        expect(normalizeCompetitionLevel('UNKNOWN')).toBeNull();
    });
});
