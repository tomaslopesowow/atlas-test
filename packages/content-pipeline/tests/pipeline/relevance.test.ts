import { describe, expect, it } from 'vitest';
import { filterBySeedRelevance } from '../../src/pipeline/relevance';
import { buildKeywordMetrics as kw } from '../support/builders';

describe('filterBySeedRelevance', () => {
    it('keeps keywords sharing a distinctive anchor token with a seed', () => {
        const out = filterBySeedRelevance(
            [
                kw({ keyword: 'orderbeheer automatiseren' }),
                kw({ keyword: 'vacature accountant' }),
            ],
            ['orderbeheer software'],
        );
        expect(out.map((k) => k.keyword)).toEqual([
            'orderbeheer automatiseren',
        ]);
    });

    it('does not anchor on a generic product noun alone', () => {
        // The seed's only non-generic token is "orderbeheer"; "software" must
        // not let an unrelated "X software" keyword through.
        const out = filterBySeedRelevance(
            [kw({ keyword: 'boekhoud software' })],
            ['orderbeheer software'],
        );
        expect(out).toHaveLength(0);
    });

    it('is a no-op when the seeds yield no usable anchors', () => {
        const keywords = [
            kw({ keyword: 'anything at all' }),
            kw({ keyword: 'x y z' }),
        ];
        // "software" is generic, "the" is grammar -> no anchors -> pass through.
        expect(filterBySeedRelevance(keywords, ['the software'])).toEqual(
            keywords,
        );
    });

    it('is a no-op for empty seeds', () => {
        const keywords = [kw({ keyword: 'orderbeheer' })];
        expect(filterBySeedRelevance(keywords, [])).toEqual(keywords);
    });

    it('matches against any of several seeds', () => {
        const out = filterBySeedRelevance(
            [
                kw({ keyword: 'fleet onderhoud' }),
                kw({ keyword: 'orderbeheer tips' }),
                kw({ keyword: 'random topic' }),
            ],
            ['orderbeheer', 'fleet management'],
        );
        expect(out.map((k) => k.keyword)).toEqual([
            'fleet onderhoud',
            'orderbeheer tips',
        ]);
    });
});
