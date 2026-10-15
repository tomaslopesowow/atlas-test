import { readFileSync } from 'node:fs';
import type { CompetitionLevel, SearchIntent } from './types';

type IntentCue = {
    keyword: string;
    intent: Extract<SearchIntent, 'commercial' | 'transactional'>;
};

const INTENT_CUES = parseIntentCues(
    readFileSync(new URL('./intent-keywords.csv', import.meta.url), 'utf8'),
);

function normalizePhrase(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseIntentCues(csv: string): IntentCue[] {
    return csv
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((line) => {
            const [keyword, intent] = line.split(',');
            if (
                !keyword ||
                (intent !== 'commercial' && intent !== 'transactional')
            ) {
                throw new Error(`Invalid intent cue row: ${line}`);
            }
            return { keyword: normalizePhrase(keyword), intent };
        });
}

export function levelToDifficulty(
    level: CompetitionLevel | null,
): number | null {
    if (level === 'LOW') return 25;
    if (level === 'MEDIUM') return 50;
    if (level === 'HIGH') return 75;
    return null;
}

export function deriveIntent(keyword: string): SearchIntent {
    const normalized = ` ${normalizePhrase(keyword)} `;
    return (
        INTENT_CUES.find(({ keyword: cue }) => normalized.includes(` ${cue} `))
            ?.intent ?? 'informational'
    );
}
