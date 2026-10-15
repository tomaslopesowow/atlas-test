import type { AppLocale } from '@repo/i18n/shared';
import { asDoc } from '@repo/lib/utils/as-doc';
import { cn } from '@repo/lib/utils/cn';
import { Button } from '@repo/ui/components/button';
import Heading from '@repo/ui/components/heading';
import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import type { Page, Tag } from '@/payload-types';

export interface TaxonomyCardProps {
    item: Page;
    locale?: AppLocale;
    className?: string;
    showTags?: boolean;
    showDate?: boolean;
    imageClassName?: string;
    titleClassName?: string;
    dateClassName?: string;
    titleTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
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
    titleTag = 'h4',
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
        <div className={cn('relative group flex flex-col gap-y-6', className)}>
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
                    <div className="flex gap-2 absolute left-4 top-4">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="bg-white rounded-md text-xs uppercase font-bold px-2 py-1"
                            >
                                {tag.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-y-3 xl:pr-12">
                {showDate && locale && (
                    <Heading
                        as="p"
                        variant="heading-6"
                        className={cn('text-sm', dateClassName)}
                    >
                        {formatDate(item.publishedAt)}
                    </Heading>
                )}

                {item?.title && showTitle && (
                    <Heading
                        as={titleTag}
                        variant="heading-5"
                        className={cn('md:w-10/12', titleClassName)}
                    >
                        {item.title}
                    </Heading>
                )}

                {taxonomyData?.description && showDescription && (
                    <p className="line-clamp-2">{taxonomyData.description}</p>
                )}
            </div>

            {item?.permalink && (
                <Button asChild variant="ghost">
                    <LinkCMS
                        link={{
                            type: 'internal',
                            relation: item,
                        }}
                        disableTitle={true}
                        target="_blank"
                        className="absolute inset-0 h-full w-full"
                        aria-label={`${item.title}`}
                    />
                </Button>
            )}
        </div>
    );
}
