import type { DataForSeoClient } from './client';
import { fetchKeywordIdeas, type KeywordIdeasParams } from './keyword-ideas';
import { fetchKeywordsForKeywords } from './keywords-for-keywords';
import type { KeywordMetrics } from './types';

export type ResearchSource = 'labs' | 'google-ads';

/**
 * Fetches keyword research, preferring the richer Labs `keyword_ideas` endpoint
 * (which includes difficulty and intent) and falling back to the Google Ads
 * `keywords_for_keywords` endpoint when Labs errors.
 *
 * Labs `keyword_ideas` intermittently returns a task-level "Internal Error" for
 * some locations (the Netherlands at time of writing), so this keeps the weekly
 * run working through such outages instead of producing nothing. The `source`
 * field reports which endpoint actually served the data.
 */
export async function fetchKeywordResearch(
    client: DataForSeoClient,
    params: KeywordIdeasParams,
    onFallback?: (message: string) => void,
): Promise<{
    keywords: KeywordMetrics[];
    cost: number;
    source: ResearchSource;
}> {
    try {
        const result = await fetchKeywordIdeas(client, params);
        return { ...result, source: 'labs' };
    } catch (error) {
        onFallback?.(
            `keyword_ideas (Labs) failed — falling back to google_ads keywords_for_keywords: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
        const result = await fetchKeywordsForKeywords(client, {
            keywords: params.keywords,
            locationCode: params.locationCode,
            languageCode: params.languageCode,
            limit: params.limit,
        });
        return { ...result, source: 'google-ads' };
    }
}
