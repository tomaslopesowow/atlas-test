import { ImageCMS } from '@/components/content/content-image';
import { formatDate } from '@/utils/format-date';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/features/shadcn/utils/ui';
import type { FormattedArticle } from '@/utils/format-article';
import type { HTMLAttributes } from 'react';

type ArticleCardProps = FormattedArticle & HTMLAttributes<HTMLDivElement>;

export const ArticleCard = ({
    title,
    cover,
    category,
    date,
    permalink,
    className,
    ...props
}: ArticleCardProps) => {
    const locale = useLocale();
    const t = useTranslations('Categories');

    return (
        <div
            key={title}
            {...props}
            className={cn('flex flex-col gap-y-4 relative group', className)}
        >
            <div className="relative w-full aspect-video bg-invert flex overflow-hidden">
                <ImageCMS
                    image={cover}
                    fill
                    className="object-cover group-hover:scale-105 group-focus-within:scale-105 transition-transform duration-700 ease-in-out will-change-transform"
                />
            </div>
            <div className="flex flex-col gap-y-6">
                <div className="flex gap-2 flex-wrap">
                    {category?.map((category) => (
                        <CategoryBadge key={category}>
                            {t(category)}
                        </CategoryBadge>
                    ))}
                </div>
                <p className="leading-none">{title}</p>
                <p className="text-sm text-body">{formatDate(date, locale)}</p>
            </div>
            <Link href={permalink} className="absolute inset-0" />
        </div>
    );
};

interface CategoryBadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'active' | 'base';
}

export const CategoryBadge = ({
    children,
    variant = 'base',
    ...props
}: CategoryBadgeProps) => {
    return (
        <div
            className={cn(
                'bg-secondary px-3 py-2',
                variant === 'active' && 'bg-invert text-invert',
            )}
            {...props}
        >
            <p className="text-xs font-sweet-sans-pro leading-none uppercase">
                {children}
            </p>
        </div>
    );
};
