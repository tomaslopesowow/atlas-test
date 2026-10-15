const STOPWORDS = new Set([
    'the',
    'and',
    'for',
    'with',
    'best',
    'how',
    'what',
    'your',
    'are',
    'vs',
    'top',
    'free',
    'new',
    'het',
    'een',
    'voor',
    'met',
    'hoe',
    'wat',
    'jouw',
    'beste',
    'gratis',
]);

export function normalizeSearchText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function extractMeaningfulTerms(value: string): string[] {
    return normalizeSearchText(value)
        .split(' ')
        .filter((term) => term.length > 2 && !STOPWORDS.has(term));
}
