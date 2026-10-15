import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { FeaturedItemsCarousel } from '@/components/common/featured-items-carousel';
import { getPayloadClient } from '../../payload/client';
import { formatArticle } from '@/utils/format-article';
import type { PageWithGenericTaxonomies } from '../../payload/features/taxonomies/types';
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@repo/i18n/shared';
import { asDoc } from '../../payload/utils/as-doc';
import { ArticleCard } from '@/components/common/article-card';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';

const ALLOWED_TAXONOMY_TYPES = ['news', 'press'] as const;
const CAROUSEL_SIZE = 10;
const SORT_BY = 'publishedAt';

defineBlockComponent({
    slug: 'related-articles-carousel',
    component: async ({ page, block: { title } }) => {
        if (!isAllowedPageTaxonomy(page, ALLOWED_TAXONOMY_TYPES)) {
            return null;
        }

        const taxonomyType = page.taxonomyType;

        const locale = (await getLocale()) as AppLocale;
        const payload = await getPayloadClient();

        const [items, settings] = await Promise.all([
            payload
                .find({
                    collection: 'pages',
                    where: {
                        taxonomyType: { equals: taxonomyType },
                        _status: { equals: 'published' },
                        slug: { not_equals: page.slug },
                    },
                    sort: SORT_BY,
                    locale,
                    limit: CAROUSEL_SIZE,
                })
                .then(
                    (response) =>
                        response.docs as PageWithGenericTaxonomies<
                            typeof taxonomyType
                        >[],
                ),
            payload.findGlobal({
                slug: 'settings',
                locale,
            }),
        ]);

        const itemNodes = items.reduce((acc: JSX.Element[], item) => {
            const formattedItem = formatArticle(item);
            if (!formattedItem) return acc;
            acc.push(
                <ArticleCard
                    key={item.title}
                    className="w-64 md:w-[400px] first-of-type:ml-0"
                    {...formattedItem}
                />,
            );
            return acc;
        }, []);

        const viewAllPermalink = asDoc(
            settings.pages?.[taxonomyType],
        )?.permalink;

        return (
            <FeaturedItemsCarousel
                title={title}
                viewAllPermalink={viewAllPermalink}
                itemNodes={itemNodes}
            />
        );
    },
});
