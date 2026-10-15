import Link from 'next/link';
import ArrowLeft from '@/components/icons/arrow-left';
import ArrowRight from '@/components/icons/arrow-right';
import { cn } from '@/utils/cn';
import { Button } from './button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    position?: 'left' | 'center' | 'right';
    className?: string;
    previousLabel?: string;
    nextLabel?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    baseUrl,
    hasPrevPage,
    hasNextPage,
    position = 'left',
    className,
    previousLabel = 'Previous',
    nextLabel = 'Next',
}: PaginationProps) {
    if (totalPages <= 1) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex justify-center items-center gap-2 pt-12 md:pt-20',
                position === 'left' && 'justify-start',
                position === 'right' && 'justify-end',
                className,
            )}
        >
            {hasPrevPage && (
                <Button className="p-2" asChild>
                    <Link
                        href={`${baseUrl}?page=${currentPage - 1}`}
                        aria-label={previousLabel}
                        scroll={false}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNumber) => (
                    <Link
                        key={pageNumber}
                        href={`${baseUrl}?page=${pageNumber}`}
                        className={cn(
                            'flex items-center justify-center w-10 h-10 rounded-md bg-gray-background2 text-sm',
                            currentPage === pageNumber
                                ? 'bg-primary text-white'
                                : 'hover:bg-primary hover:text-white transition-colors duration-500',
                        )}
                        scroll={false}
                    >
                        {pageNumber}
                    </Link>
                ),
            )}

            {hasNextPage && (
                <Button className="p-2" asChild>
                    <Link
                        href={`${baseUrl}?page=${currentPage + 1}`}
                        aria-label={nextLabel}
                        scroll={false}
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </Button>
            )}
        </div>
    );
}
