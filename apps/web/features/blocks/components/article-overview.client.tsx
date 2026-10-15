'use client';

import { ImageCMS } from '@/components/content/content-image';
import type { PageWithGenericTaxonomies } from '../../payload/features/taxonomies/types';
import { Heading } from '@/components/common/heading';
import type { ArticleOverview } from '@/payload-types';
import { asDoc } from '../../payload/utils/as-doc';
import { formatDate } from '@/utils/format-date';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { NEWS_TAXONOMY_CATEGORIES } from '../../payload/features/taxonomies/shared';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Pagination } from '@/components/common/pagination';
import { useSmoothScroll } from '../../animation/components/smooth-scroll-context';
import { HEADER_HEIGHT_REM } from '@/utils/shared';
import { Button } from '../../shadcn/ui/button';
import { LinkCMS } from '@/components/content/content-link';
import { formatArticle } from '@/utils/format-article';
import { ArticleCard, CategoryBadge } from '@/components/common/article-card';
import { Diorama } from '../../animation/components/diorama';

type Category = {
    label: string;
    value: string | null;
};

interface ArticleOverviewClientProps extends ArticleOverview {
    articles: PageWithGenericTaxonomies<'news' | 'press'>[];
    activeCategory: Category['value'];
    pagination: {
        currentPage: number;
        totalPages: number;
    };
}

export const ArticleOverviewClient = ({
    taxonomyType,
    articles,
    featuredArticle,
    activeCategory,
    pagination,
    callToAction,
}: ArticleOverviewClientProps) => {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('Categories');

    const formattedFeaturedArticle = formatArticle(
        asDoc(featuredArticle) as PageWithGenericTaxonomies<
            typeof taxonomyType
        >,
    );

    const formattedArticles = articles
        .map(formatArticle)
        .filter((article) => article !== null);

    const categories: Category[] = [
        { label: t('all'), value: null },
        ...Object.keys(NEWS_TAXONOMY_CATEGORIES).map((key) => ({
            label: t(key),
            value: key,
        })),
    ];

    const handleCategoryChange = (category: Category['value']) => {
        const url = new URL(window.location.href);
        if (category === null) {
            url.searchParams.delete('category');
        } else {
            url.searchParams.set('category', category);
        }
        url.searchParams.delete('page');
        router.push(url.toString(), { scroll: false });
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    const { scrollTo } = useSmoothScroll();
    const handlePageChange = (page: number) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', page.toString());
        router.push(url.toString(), { scroll: false });

        if (scrollRef.current?.offsetTop) {
            const targetScrollY =
                scrollRef.current?.offsetTop - HEADER_HEIGHT_REM * 16;
            scrollTo(targetScrollY);
        }
    };

    return (
        <div className="grid gap-y-32">
            {formattedFeaturedArticle && (
                <div className="flex flex-col gap-y-6 relative">
                    <Diorama>
                        <ImageCMS
                            image={formattedFeaturedArticle.cover}
                            className="w-full aspect-video object-cover"
                        />
                    </Diorama>
                    <div className="flex gap-2 flex-wrap">
                        {formattedFeaturedArticle.category?.map((category) => (
                            <CategoryBadge key={category}>
                                {t(category)}
                            </CategoryBadge>
                        ))}
                    </div>
                    <Heading variant="heading-5" className="leading-none">
                        {formattedFeaturedArticle.title}
                    </Heading>
                    <p className="text-sm text-body">
                        {formatDate(formattedFeaturedArticle.date, locale)}
                    </p>
                    <Link
                        href={formattedFeaturedArticle.permalink}
                        className="absolute inset-0"
                    />
                </div>
            )}
            <div className="flex flex-col gap-y-14" ref={scrollRef}>
                {/* TODO: make this more generic? */}
                {taxonomyType === 'news' && (
                    <div className="flex gap-2 flex-wrap">
                        {categories.map(({ label, value }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => handleCategoryChange(value)}
                            >
                                <CategoryBadge
                                    variant={
                                        activeCategory === value
                                            ? 'active'
                                            : 'base'
                                    }
                                >
                                    {label}
                                </CategoryBadge>
                            </button>
                        ))}
                    </div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-16">
                    {callToAction?.enabled ? (
                        <>
                            {formattedArticles.slice(0, 2).map((article) => (
                                <ArticleCard
                                    key={article?.title}
                                    {...article}
                                />
                            ))}
                            <div className="w-full aspect-video bg-invert flex flex-col justify-between text-invert p-4 xl:p-10">
                                <Heading variant="base">
                                    {callToAction.eyebrow}
                                </Heading>
                                <div className="flex justify-between">
                                    <div className="flex flex-col gap-y-1">
                                        <p className="font-medium">
                                            {callToAction.title}
                                        </p>
                                        <p className="text-sm text-white opacity-60">
                                            {callToAction.subtitle}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        variant="secondary"
                                        className="bg-white text-dark-blue"
                                    >
                                        <LinkCMS link={callToAction.link} />
                                    </Button>
                                </div>
                            </div>
                            {formattedArticles.slice(2).map((article) => (
                                <ArticleCard
                                    key={article?.title}
                                    {...article}
                                />
                            ))}
                        </>
                    ) : (
                        formattedArticles.map((article) => (
                            <ArticleCard key={article?.title} {...article} />
                        ))
                    )}
                </div>
            </div>
            <Pagination {...pagination} onChange={handlePageChange} />
        </div>
    );
};
