import { describe, expect, it } from 'vitest';
import type { DataForSeoClient } from '../../src/dataforseo/client';
import { fetchKeywordResearch } from '../../src/dataforseo/research';

describe('fetchKeywordResearch', () => {
    it('preserves the requested limit on the Google Ads fallback', async () => {
        const client: DataForSeoClient = {
            async live(path) {
                if (path.includes('keyword_ideas')) {
                    throw new Error('Labs unavailable');
                }

                return {
                    cost: 0.01,
                    result: [
                        { keyword: 'first', search_volume: 30 },
                        { keyword: 'second', search_volume: 20 },
                        { keyword: 'third', search_volume: 10 },
                    ],
                } as never;
            },
        };

        const result = await fetchKeywordResearch(client, {
            keywords: ['orders'],
            locationCode: 2528,
            languageCode: 'nl',
            limit: 2,
        });

        expect(result.source).toBe('google-ads');
        expect(result.keywords.map(({ keyword }) => keyword)).toEqual([
            'first',
            'second',
        ]);
    });
});
