import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { DataForSeoClient } from '../../dataforseo/client';
import { fetchKeywordResearch } from '../../dataforseo/research';

export function createKeywordResearchTool(client: DataForSeoClient) {
    return createTool({
        id: 'keyword-research',
        description:
            'Look up search volume, ranking difficulty and search intent for seed keywords via DataForSEO.',
        inputSchema: z.object({
            keywords: z.array(z.string()).min(1),
            locationCode: z.number().default(2528),
            languageCode: z.string().default('nl'),
            limit: z.number().max(200).default(50),
        }),
        outputSchema: z.object({
            source: z.enum(['labs', 'google-ads']),
            keywords: z.array(
                z.object({
                    keyword: z.string(),
                    searchVolume: z.number(),
                    difficulty: z.number().nullable(),
                    intent: z.string().nullable(),
                }),
            ),
        }),
        execute: async ({ keywords, locationCode, languageCode, limit }) => {
            const result = await fetchKeywordResearch(client, {
                keywords,
                locationCode: locationCode ?? 2528,
                languageCode: languageCode ?? 'nl',
                limit: limit ?? 50,
            });

            return {
                source: result.source,
                keywords: result.keywords.map((keyword) => ({
                    keyword: keyword.keyword,
                    searchVolume: keyword.searchVolume,
                    difficulty: keyword.difficulty,
                    intent: keyword.intent,
                })),
            };
        },
    });
}
