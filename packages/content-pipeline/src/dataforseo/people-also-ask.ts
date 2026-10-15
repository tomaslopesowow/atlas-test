import type { DataForSeoClient } from './client';

const PATH = '/serp/google/organic/live/advanced';

type SerpItem = {
    type?: string | null;
    items?: Array<{ type?: string | null; title?: string | null }> | null;
};

export type SerpOrganicResult = { items?: SerpItem[] | null };

export type PeopleAlsoAskParams = {
    /** The keyword whose SERP to inspect (typically a topic's primary keyword). */
    keyword: string;
    /** DataForSEO location code (e.g. 2528 = Netherlands, 2840 = United States). */
    locationCode: number;
    /** DataForSEO language code (e.g. 'nl', 'en'). */
    languageCode: string;
    /** Search-result depth to request. */
    depth?: number;
};

/**
 * Extracts the "People also ask" questions from a live/advanced SERP result.
 * Pure parser, exported so it can be unit-tested against fixtures without a
 * network call. Returns the question titles, trimmed and deduplicated, in SERP
 * order, or an empty array when the result carries no matching block.
 */
export function extractPeopleAlsoAskQuestions(
    result: SerpOrganicResult[],
): string[] {
    const questions = (result[0]?.items ?? [])
        .filter((item) => item.type === 'people_also_ask')
        .flatMap((item) => item.items ?? [])
        .map((element) => element.title?.trim() ?? '')
        .filter((title) => title.length > 0);

    return Array.from(new Set(questions));
}

/**
 * Fetches the real "People also ask" questions Google shows for a keyword, so
 * the brief outline and the post FAQ can answer the questions searchers
 * actually ask instead of questions the model invents.
 */
export async function fetchPeopleAlsoAsk(
    client: DataForSeoClient,
    params: PeopleAlsoAskParams,
): Promise<{ questions: string[]; cost: number }> {
    const { result, cost } = await client.live<SerpOrganicResult>(PATH, {
        keyword: params.keyword,
        location_code: params.locationCode,
        language_code: params.languageCode,
        depth: params.depth ?? 10,
    });

    return {
        questions: extractPeopleAlsoAskQuestions(result),
        cost,
    };
}
