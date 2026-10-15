import { blocksRegistry } from '@/features/blocks/registry';
import { NewsList } from '@/features/payload/blocks/news-list';
import { getPayloadClient } from '@/features/payload/client';
import type { Page } from '@/payload-types';
import type { AppLocale } from '@repo/i18n/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import type { PaginatedDocs } from 'payload';
import { SectionHeading } from '../common/section-heading';
import { TaxonomyCard } from '../common/taxonomy-card/taxonomy-card';
import { Pagination } from '../ui/pagination';
import { cn } from '../utils/ui';

const PAGINATION_POSITION: 'left' | 'center' | 'right' = 'left';
const CARD_ROUNDED = 'rounded-md';
const CARD_ASPECT_RATIO = 'aspect-[4/3]';
const GRID_GAP = 'gap-x-4 gap-y-12 xl:gap-y-16';

blocksRegistry.addBlock(NewsList.slug, {
    component: async ({ page, block, pageProps }) => {
        const [payload, locale, t, searchParams] = await Promise.all([
            getPayloadClient(),
            getLocale(),
            getTranslations(),
            pageProps.searchParams,
        ]);

        const unsafePage = searchParams.page
            ? Number.parseInt(searchParams.page as string)
            : 0;

        const pagination = {
            size: block.itemsPerPage ?? 12,
            page: (Number.isNaN(unsafePage) ? 1 : unsafePage) || 1,
        };

        const sortBy =
            block.sortBy === 'newest first'
                ? '-publishedAt'
                : block.sortBy === 'oldest first'
                  ? 'publishedAt'
                  : block.sortBy === 'alphabetical'
                    ? 'title'
                    : '-title';

        let posts: PaginatedDocs<Page>;

        if (block.CustomPages) {
            const customPageIds =
                block.customPages
                    ?.map((page) => (typeof page === 'string' ? page : page.id))
                    .filter(Boolean) || [];

            posts = await payload.find({
                collection: 'pages',
                limit: pagination.size,
                where: {
                    id: { in: customPageIds },
                    _status: { equals: 'published' },
                },
                locale: locale as AppLocale,
            });
        } else {
            posts = await payload.find({
                collection: 'pages',
                sort: sortBy,
                limit: pagination.size,
                page: pagination.page,
                where: {
                    taxonomyType: { equals: 'news' },
                    _status: { equals: 'published' },
                },
                locale: locale as AppLocale,
            });
        }

        return (
            <div
                id={`${block.id}`}
                className="flex flex-col gap-y-12 md:gap-y-16 xl:gap-y-20"
            >
                <div className="flex flex-col gap-y-4">
                    <SectionHeading
                        sectionTitle={block.sectionTitle}
                        title={block.title}
                        text={block.text}
                    />
                </div>
                <div className="flex flex-col justify-start">
                    <div className={cn('grid grid-cols-12', GRID_GAP)}>
                        {posts.docs.map((page) => {
                            return (
                                <TaxonomyCard
                                    key={page.id}
                                    isOverview={true}
                                    item={page}
                                    className={cn(
                                        'col-span-12 md:col-span-6 xl:col-span-4',
                                        block.gridColumns === '2' &&
                                            'col-span-12 md:col-span-6 xl:col-span-6',
                                    )}
                                    locale={locale as AppLocale}
                                    showDescription={block.Description ?? false}
                                    showTags={block.Tags ?? false}
                                    showDate={block.Date ?? false}
                                    showTitle={block.Title ?? false}
                                    rounded={CARD_ROUNDED}
                                    aspectRatio={CARD_ASPECT_RATIO}
                                />
                            );
                        })}
                    </div>

                    {posts.totalPages > 1 &&
                        block.pagination === 'pagination' && (
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={posts.totalPages}
                                baseUrl={page.permalink || ''}
                                hasPrevPage={posts.hasPrevPage}
                                hasNextPage={posts.hasNextPage}
                                position={PAGINATION_POSITION}
                                previousLabel={t('common.previous')}
                                nextLabel={t('common.next')}
                            />
                        )}
                </div>
            </div>
        );
    },
});
