import type { KeywordMetrics } from '../dataforseo/types';
import { extractMeaningfulTerms } from './text-utils';

const GENERIC_TERMS = new Set([
    'software',
    'tool',
    'tools',
    'system',
    'systems',
    'systeem',
    'app',
    'apps',
    'platform',
    'platforms',
    'management',
    'solution',
    'solutions',
    'service',
    'services',
    'online',
]);

export function filterBySeedRelevance(
    keywords: KeywordMetrics[],
    seedTerms: string[],
): KeywordMetrics[] {
    const anchors = new Set<string>();

    for (const seed of seedTerms) {
        for (const term of extractMeaningfulTerms(seed)) {
            if (!GENERIC_TERMS.has(term)) anchors.add(term);
        }
    }

    if (anchors.size === 0) return keywords;

    return keywords.filter((keyword) =>
        extractMeaningfulTerms(keyword.keyword).some((term) =>
            anchors.has(term),
        ),
    );
}
