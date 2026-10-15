import type { CompetitionLevel, SearchIntent } from './types';

export function normalizeCompetitionLevel(
    value?: string | null,
): CompetitionLevel | null {
    return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH'
        ? value
        : null;
}

export function normalizeSearchIntent(
    value?: string | null,
): SearchIntent | null {
    return value === 'informational' ||
        value === 'navigational' ||
        value === 'commercial' ||
        value === 'transactional'
        ? value
        : null;
}
