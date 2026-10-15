import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';
import ArrowLeft from '../icons/arrow-left';
import ArrowRight from '../icons/arrow-right';

interface PaginationProps extends Omit<ComponentProps<'div'>, 'onChange'> {
    totalPages: number;
    currentPage: number;
    onChange: (page: number) => void;
}

type PaginationItem = number | 'ellipsis';

const getPaginationItems = (
    currentPage: number,
    totalPages: number,
    isMobile: boolean,
): PaginationItem[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pagesToShow = new Set<number>();

    pagesToShow.add(1);
    pagesToShow.add(totalPages);

    if (isMobile) {
        pagesToShow.add(currentPage);

        if (currentPage === 1 && totalPages > 1) {
            pagesToShow.add(2);
        }
        if (currentPage === totalPages && totalPages > 1) {
            pagesToShow.add(totalPages - 1);
        }
    } else {
        let rangeStart = currentPage - 1;
        let rangeEnd = currentPage + 1;

        if (rangeStart < 1) {
            rangeStart = 1;
            rangeEnd = Math.min(3, totalPages);
        }
        if (rangeEnd > totalPages) {
            rangeEnd = totalPages;
            rangeStart = Math.max(1, totalPages - 2);
        }

        for (let i = rangeStart; i <= rangeEnd; i++) {
            pagesToShow.add(i);
        }
    }

    const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
    const items: PaginationItem[] = [];

    for (let i = 0; i < sortedPages.length; i++) {
        const page = sortedPages[i];

        if (i > 0 && page - sortedPages[i - 1] > 1) {
            items.push('ellipsis');
        }

        items.push(page);
    }

    return items;
};

export const Pagination = ({
    totalPages,
    currentPage,
    onChange,
    className,
}: PaginationProps) => {
    const t = useTranslations('common');
    const mobilePagination = getPaginationItems(currentPage, totalPages, true);
    const desktopPagination = getPaginationItems(
        currentPage,
        totalPages,
        false,
    );

    return (
        <div
            className={cn(
                'flex justify-between items-center md:gap-x-16',
                className,
            )}
        >
            {/* mobile button */}
            <Button
                disabled={currentPage === 1}
                onClick={() => onChange(currentPage - 1)}
                size="sm"
                className="gap-x-3 sm:hidden"
            >
                <ArrowLeft className="size-3" />
                <span className="hidden sm:block">{t('previous')}</span>
            </Button>

            {/* > larger-than-mobile button */}
            <Button
                disabled={currentPage === 1}
                onClick={() => onChange(currentPage - 1)}
                size="lg"
                className="gap-x-3 hidden sm:flex"
            >
                <ArrowLeft className="size-3" />
                <span className="hidden sm:inline-flex">{t('previous')}</span>
            </Button>

            {[mobilePagination, desktopPagination].map((items, index) => (
                <div
                    key={String(index)}
                    className={cn(
                        'gap-x-2 hidden',
                        index === 0 && 'max-sm:flex',
                        index === 1 && 'sm:flex',
                    )}
                >
                    {items.map((item, index) =>
                        item === 'ellipsis' ? (
                            <span
                                key={`ellipsis-${String(index)}`}
                                className="flex items-center px-2"
                            >
                                ...
                            </span>
                        ) : (
                            <Button
                                key={String(index)}
                                onClick={() => onChange(item)}
                                variant="ghost"
                                className={cn(
                                    'size-10 md:size-12 justify-center items-center',
                                    currentPage === item &&
                                        'bg-invert border-tertiary text-invert',
                                )}
                            >
                                {item}
                            </Button>
                        ),
                    )}
                </div>
            ))}

            {/* mobile button */}
            <Button
                disabled={currentPage >= totalPages}
                onClick={() => onChange(currentPage + 1)}
                size="sm"
                className="gap-x-3 sm:hidden"
            >
                <span className="hidden sm:block">{t('next')}</span>
                <ArrowRight className="size-3" />
            </Button>

            {/* > larger-than-mobile button */}
            <Button
                disabled={currentPage >= totalPages}
                onClick={() => onChange(currentPage + 1)}
                size="lg"
                className="gap-x-3 hidden sm:inline-flex"
            >
                <span className="hidden sm:block">{t('next')}</span>
                <ArrowRight className="size-3" />
            </Button>
        </div>
    );
};
