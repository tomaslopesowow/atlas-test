import {
    type InternalLinkTarget,
    pageTarget,
} from '@repo/content-pipeline/pipeline/internal-link-targets';
import { extractMeaningfulTerms } from '@repo/content-pipeline/pipeline/text-utils';
import type { AppLocale } from '@repo/i18n/shared';
import type { Payload, Where } from 'payload';

export async function findInternalLinks(
    payload: Payload,
    input: { query: string; locale: string; limit: number },
): Promise<InternalLinkTarget[]> {
    const extracted = Array.from(new Set(extractMeaningfulTerms(input.query)));
    const terms = extracted.length ? extracted : [input.query];
    const published: Where = { _status: { equals: 'published' } };
    const titleOr: Where = {
        or: terms.map(
            (term): Where => ({
                title: { contains: term },
            }),
        ),
    };

    const result = await payload.find({
        collection: 'pages',
        locale: input.locale as AppLocale,
        where: { and: [published, titleOr] },
        limit: input.limit,
        depth: 0,
    });

    return result.docs
        .map((doc) => pageTarget(input.locale, doc))
        .filter((link): link is InternalLinkTarget => link !== null)
        .slice(0, input.limit);
}
