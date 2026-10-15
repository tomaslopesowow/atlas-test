import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { ArticleOverviewClient } from './article-overview.client';
import { getPayloadClient } from '../../payload/client';
import type { PageWithGenericTaxonomies } from '../../payload/features/taxonomies/types';
import type { Where } from 'payload';

const PAGE_SIZE = 9;

defineBlockComponent({
    slug: 'article-overview',
    component: async ({ block, pageProps }) => {
        const payload = await getPayloadClient();

        const searchParams = await pageProps.searchParams;
        const activeCategory =
            typeof searchParams.category === 'string'
                ? searchParams.category
                : null;

        const currentPage =
            typeof searchParams.page === 'string'
                ? Number(searchParams.page)
                : 1;

        const query: Where = {
            and: [
                {
                    taxonomyType: {
                        equals: block.taxonomyType,
                    },
                },
                {
                    ...(block.taxonomyType === 'news' && activeCategory
                        ? {
                              'taxonomyData.news.category': {
                                  equals: activeCategory,
                              },
                          }
                        : {}),
                },
                {
                    _status: {
                        equals: 'published',
                    },
                },
            ],
        };

        const response = await payload.find({
            collection: 'pages',
            where: query,
            limit: block.callToAction?.enabled ? PAGE_SIZE - 1 : PAGE_SIZE,
            page: currentPage,
        });

        const articles = response.docs as PageWithGenericTaxonomies<
            'news' | 'press'
        >[];
        const totalPages = response.totalPages;

        return (
            <ArticleOverviewClient
                {...block}
                articles={articles}
                activeCategory={activeCategory}
                pagination={{
                    currentPage,
                    totalPages,
                }}
            />
        );
    },
});
