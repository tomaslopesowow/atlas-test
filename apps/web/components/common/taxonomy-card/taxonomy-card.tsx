import { ImageCMS } from '@/components/content/content-image';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Page, Tag } from '@/payload-types';
import type { AppLocale } from '@repo/i18n/shared';
import Link from 'next/link';
import { cn } from '../../utils/ui';
import Heading from '../heading';

export interface TaxonomyCardProps {
    item: Page;
    locale?: AppLocale;
    className?: string;
    showTags?: boolean;
    showDate?: boolean;
    imageClassName?: string;
    titleClassName?: string;
    dateClassName?: string;
    isOverview?: boolean;
    showDescription?: boolean;
    showTitle?: boolean;
    rounded?: string;
    aspectRatio?: string;
}

export function TaxonomyCard({
    item,
    locale,
    className,
    showTags = true,
    showDate = true,
    imageClassName,
    titleClassName,
    dateClassName,
    isOverview = false,
    showDescription = false,
    showTitle = false,
    rounded = '',
    aspectRatio = '',
}: TaxonomyCardProps) {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString || !locale) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getTaxonomyData = () => {
        if (!item.taxonomyType || !item.taxonomyData) return null;
        return item.taxonomyData[
            item.taxonomyType as keyof typeof item.taxonomyData
        ];
    };

    const taxonomyData = getTaxonomyData();
    const tags = item.tags?.map(asDoc).filter(Boolean) as Tag[];

    return (
        <div className={cn('relative group', className)}>
            <div
                className={cn(
                    'relative w-full overflow-hidden',
                    aspectRatio,
                    rounded,
                )}
            >
                <ImageCMS
                    image={taxonomyData?.cover}
                    className={cn(
                        'absolute inset-0 w-full h-full object-cover md:group-hover:scale-105 !transition-all !duration-300 !ease-in-out',
                        imageClassName,
                    )}
                    sizes="(max-width: 768px) 100vw, 30vw"
                />

                {showTags && item.tags && item.tags.length > 0 && (
                    <div className="flex gap-x-2 absolute left-4 top-4">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="bg-secondary rounded-sm text-sm px-2 py-1"
                            >
                                {tag.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showDate && locale && (
                <Heading
                    as="p"
                    variant="heading-6"
                    className={cn('mt-4 text-sm', dateClassName)}
                >
                    {formatDate(item.publishedAt)}
                </Heading>
            )}

            {item?.title && showTitle && (
                <Heading
                    as={isOverview ? 'h2' : 'h3'}
                    variant="heading-5"
                    className={cn('mt-3 md:w-10/12', titleClassName)}
                >
                    {item.title}
                </Heading>
            )}

            {taxonomyData?.description && showDescription && (
                <Heading
                    as="p"
                    variant="heading-6"
                    className="mt-4 line-clamp-2 text-muted text-sm font-normal"
                >
                    {taxonomyData.description}
                </Heading>
            )}

            {item?.permalink && (
                <Link
                    href={item?.permalink}
                    target="_blank"
                    className="absolute inset-0 focus:outline-offset-2 focus-visible:outline-primary"
                    aria-label={`${item.title}`}
                />
            )}
        </div>
    );
}
