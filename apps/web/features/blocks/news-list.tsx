import { SectionHeading } from '@/components/common/section-heading';
import { TaxonomyCard } from '@/components/common/taxonomy-card/taxonomy-card';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { getPayloadClient } from '@/features/payload/client';
import { Pagination } from '@/features/shadcn/ui/pagination';
import { cn } from '@/features/shadcn/utils/ui';
import type { Page } from '@/payload-types';
import type { AppLocale } from '@repo/i18n/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import type { PaginatedDocs } from 'payload';

const PAGINATION_POSITION: 'left' | 'center' | 'right' = 'left';
const CARD_ROUNDED = 'rounded-md';
const CARD_ASPECT_RATIO = 'aspect-[4/3]';
const GRID_GAP = 'gap-x-4 gap-y-12 md:gap-y-16 xl:gap-y-20';

blocksRegistry.addBlock({
    block: {
        slug: 'news-list',
        labels: {
            singular: 'News List',
            plural: 'News Lists',
        },
        imageURL: '/admin-assets/block-thumbnails/news-list.jpg',
        fields: [
            {
                name: 'sectionTitle',
                type: 'text',
                localized: true,
            },
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'text',
                type: 'textarea',
                localized: true,
            },
            {
                name: 'CustomPages',
                type: 'checkbox',
                defaultValue: false,
            },
            {
                name: 'customPages',
                type: 'relationship',
                relationTo: 'pages',
                filterOptions: {
                    taxonomyType: { equals: 'news' },
                },
                hasMany: true,
                admin: {
                    isSortable: true,
                    condition: (_data, siblingData) => siblingData.CustomPages,
                },
            },
            {
                type: 'collapsible',
                label: 'List Options',
                admin: {
                    description:
                        'These settings allow you to customize the visible items in the list.',
                },
                fields: [
                    {
                        name: 'Title',
                        type: 'checkbox',
                        defaultValue: true,
                        admin: {
                            style: {
                                display: 'inline-block',
                            },
                        },
                    },
                    {
                        name: 'Description',
                        type: 'checkbox',
                        defaultValue: true,
                        admin: {
                            style: {
                                display: 'inline-block',
                                marginLeft: '3em',
                            },
                        },
                    },
                    {
                        name: 'Date',
                        type: 'checkbox',
                        defaultValue: false,
                        admin: {
                            style: {
                                display: 'inline-block',
                                marginLeft: '3em',
                            },
                        },
                    },
                    {
                        name: 'Tags',
                        type: 'checkbox',
                        defaultValue: false,
                        admin: {
                            style: {
                                display: 'inline-block',
                                marginLeft: '3em',
                            },
                        },
                    },
                    {
                        name: 'itemsPerPage',
                        type: 'number',
                        defaultValue: 12,
                    },
                    {
                        name: 'sortBy',
                        type: 'select',
                        options: [
                            'newest first',
                            'oldest first',
                            'alphabetical',
                            'alphabetical reverse',
                        ],
                        defaultValue: 'newest first',
                    },
                    {
                        name: 'gridColumns',
                        type: 'select',
                        options: ['2', '3'],
                        defaultValue: '3',
                    },
                    {
                        name: 'pagination',
                        type: 'select',
                        options: ['pagination', 'none'],
                        defaultValue: 'pagination',
                    },
                ],
            },
        ],
    },

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
            <section
                id={`${block.id}`}
                className="flex flex-col gap-y-12 md:gap-y-16 xl:gap-y-20"
            >
                <div className="flex flex-col gap-y-4 xl:w-8/12">
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
                                    titleTag={
                                        block.sectionTitle && block.title
                                            ? 'h4'
                                            : 'h3'
                                    }
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
            </section>
        );
    },
});
