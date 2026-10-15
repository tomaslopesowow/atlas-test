import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { FeaturedItemsCarousel } from '@/components/common/featured-items-carousel';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import { getPayloadClient } from '@/features/payload/client';
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@repo/i18n/shared';
import { YachtCard } from '@/components/common/yacht-card';
import {
    formatFleetYacht,
    formatResaleYacht,
    type FormattedFleetYacht,
    type FormattedResaleYacht,
} from '@/utils/format-yacht';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import { asDoc } from '@/features/payload/utils/as-doc';

const ALLOWED_TAXONOMY_TYPES = ['resale', 'fleet'] as const;

defineBlockComponent({
    slug: 'related-yachts-carousel',
    component: async ({ page, block: { title } }) => {
        if (!isAllowedPageTaxonomy(page, ALLOWED_TAXONOMY_TYPES)) {
            return null;
        }

        const { taxonomyType } = page;

        const [payload, locale] = await Promise.all([
            getPayloadClient(),
            getLocale(),
        ]);

        const yachtQuery = payload
            .find({
                collection: 'pages',
                where: {
                    taxonomyType: { equals: taxonomyType },
                    _status: { equals: 'published' },
                    slug: { not_equals: page.slug },
                },
                limit: 10,
                locale: locale as AppLocale,
            })
            .then(
                (response) =>
                    response.docs as PageWithGenericTaxonomies<
                        'fleet' | 'resale'
                    >[],
            );

        const [items, settings] = await Promise.all([
            yachtQuery,
            payload.findGlobal({
                slug: 'settings',
                locale: locale as AppLocale,
            }),
        ]);

        let formattedItems:
            | (FormattedFleetYacht | null)[]
            | (FormattedResaleYacht | null)[] = [];

        switch (taxonomyType) {
            case 'fleet':
                formattedItems = items.map((item) => {
                    return formatFleetYacht(
                        item as PageWithGenericTaxonomies<'fleet'>,
                    );
                });
                break;
            case 'resale':
                formattedItems = items.map((item) => {
                    return formatResaleYacht(
                        item as PageWithGenericTaxonomies<'resale'>,
                        locale,
                    );
                });
                break;
        }

        const itemNodes = formattedItems
            .filter((item) => item != null)
            .map((item) => {
                return (
                    <YachtCard
                        key={item?.id}
                        {...item}
                        className="w-64 md:w-[400px] first-of-type:ml-0"
                    />
                );
            });

        const viewAllPermalink = asDoc(
            settings.pages?.[taxonomyType],
        )?.permalink;

        return (
            <FeaturedItemsCarousel
                title={title}
                itemNodes={itemNodes}
                viewAllPermalink={viewAllPermalink}
            />
        );
    },
});
