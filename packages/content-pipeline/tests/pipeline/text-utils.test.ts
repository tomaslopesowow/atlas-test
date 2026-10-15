import { describe, expect, it } from 'vitest';
import {
    extractMeaningfulTerms,
    normalizeSearchText,
} from '../../src/pipeline/text-utils';

describe('normalizeSearchText', () => {
    it('lowercases, replaces punctuation with spaces and collapses whitespace', () => {
        expect(normalizeSearchText('Order-Management / ERP')).toBe(
            'order management erp',
        );
    });

    it('collapses runs of whitespace and trims', () => {
        expect(normalizeSearchText('  order   \n  management  ')).toBe(
            'order management',
        );
    });

    it('returns an empty string for empty input', () => {
        expect(normalizeSearchText('')).toBe('');
    });
});

describe('extractMeaningfulTerms', () => {
    it('drops tokens of 2 chars or fewer', () => {
        expect(extractMeaningfulTerms('po nr order')).toEqual(['order']);
    });

    it('drops English and Dutch stopwords', () => {
        // "the"/"vs" (en) and "het"/"beste" (nl) are stopwords; topical words stay.
        expect(extractMeaningfulTerms('the best vs orderbeheer')).toEqual([
            'orderbeheer',
        ]);
        expect(extractMeaningfulTerms('het beste orderbeheer systeem')).toEqual(
            ['orderbeheer', 'systeem'],
        );
    });

    it('returns an empty array for stopword-only or empty input', () => {
        expect(extractMeaningfulTerms('')).toEqual([]);
        expect(extractMeaningfulTerms('the and for')).toEqual([]);
    });
});
