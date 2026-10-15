import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { asDoc } from '../../payload/utils/as-doc';
import { getPayloadClient } from '../../payload/client';
import { YachtCard } from '@/components/common/yacht-card';
import { formatFleetYacht } from '@/utils/format-yacht';
import type { PageWithGenericTaxonomies } from '../../payload/features/taxonomies/types';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import { getLocale } from 'next-intl/server';

const LOG_PREFIX = '[fleet-yacht-item]';

/**
 * Creates a regex pattern from a slug that makes hyphens optional.
 * This allows matching slugs like "lescinq" with "les-cinq" and other hyphen variations.
 *
 * @example
 * createSlugRegexPattern("lescinq") // Returns: "l-?e-?s-?c-?i-?n-?q"
 * // This matches: "lescinq", "les-cinq", "le-scinq", etc.
 */
const createSlugRegexPattern = (slug: string): string => {
    // Remove existing hyphens to normalize the slug
    const normalized = slug.replace(/-/g, '');
    // Insert optional hyphen pattern between each character
    return normalized.split('').join('-?');
};

defineBlockComponent({
    slug: 'fleet-yacht-item',
    component: async ({ block }) => {
        const [payload, locale] = await Promise.all([
            getPayloadClient(),
            getLocale(),
        ]);

        let fleetPage: PageWithGenericTaxonomies<'fleet'> | null = null;

        switch (block.type) {
            case 'page': {
                const page = asDoc(block.page);
                if (!isAllowedPageTaxonomy(page, ['fleet' as const]))
                    return null;
                fleetPage = page;
                break;
            }
            case 'slug': {
                if (!block.slug) {
                    fleetPage = null;
                    break;
                }

                // IMPORTANT: using MongoDB aggregation to perform a fuzzy regex match on slug,
                // making hyphens optional to handle CraftCMS → PayloadCMS slug variations.
                // Example: "lescinq" will match both "lescinq" and "les-cinq".
                // In the future, we should prefer using the page relationship field above.
                // NOTE: Slug is a localized field, so we need to match against the current locale
                const regexPattern = createSlugRegexPattern(block.slug);

                const results = await payload.db.connection
                    .collection('pages')
                    .aggregate([
                        {
                            $match: {
                                taxonomyType: 'fleet',
                                $or: [
                                    {
                                        [`slug.${locale}`]: {
                                            $regex: new RegExp(
                                                `^${regexPattern}$`,
                                                'i',
                                            ),
                                        },
                                    },
                                ],
                            },
                        },
                        { $limit: 1 },
                        { $project: { _id: 1 } },
                    ])
                    .toArray();

                if (results[0]?._id) {
                    // The aggregator returns raw MongoDB documents,
                    // so we use the Payload client to get the properly formatted page.
                    fleetPage = (await payload.findByID({
                        collection: 'pages',
                        id: results[0]._id.toString(),
                        depth: 1,
                    })) as PageWithGenericTaxonomies<'fleet'> | null;
                } else {
                    fleetPage = null;
                }
                break;
            }
        }

        if (!fleetPage) {
            payload.logger.info(
                `${LOG_PREFIX} Fleet yacht page not found for fleet-yacht-item block (slug: ${block.slug}, type: ${block.type})`,
            );
            return null;
        }

        const formattedYacht = formatFleetYacht(fleetPage);

        if (!formattedYacht) {
            payload.logger.info(
                `${LOG_PREFIX} Failed to format fleet yacht data for page ID: ${fleetPage.id}`,
            );
            return null;
        }

        payload.logger.info(
            `${LOG_PREFIX} Rendering fleet yacht item for yacht: ${formattedYacht.title} (page ID: ${fleetPage.id})`,
        );

        return (
            <section className="flex flex-col gap-4 max-w-[65ch] mx-auto relative">
                <YachtCard {...formattedYacht} diorama={true} />
            </section>
        );
    },
});
