import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { InternalLinkTarget } from '../../pipeline/internal-link-targets';

export type FindInternalLinks = (input: {
    query: string;
    locale: string;
    limit: number;
}) => Promise<InternalLinkTarget[]>;

export function createInternalLinksTool(options: {
    defaultLocale: string;
    findInternalLinks: FindInternalLinks;
}) {
    return createTool({
        id: 'internal-links',
        description:
            'Find existing published pages to link to internally. Returns their titles and relative URLs.',
        inputSchema: z.object({
            query: z.string(),
            locale: z.string().default(options.defaultLocale),
            limit: z.number().max(10).default(5),
        }),
        outputSchema: z.object({
            links: z.array(
                z.object({
                    title: z.string(),
                    url: z.string(),
                }),
            ),
        }),
        execute: async ({ query, locale, limit }) => ({
            links: await options.findInternalLinks({
                query,
                locale: locale ?? options.defaultLocale,
                limit: limit ?? 5,
            }),
        }),
    });
}
