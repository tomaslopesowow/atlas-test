'use client';

import { cn } from '@/features/shadcn/utils/ui';
import type { Maybe } from '@/utils/maybe';
import type { HTMLAttributes } from 'react';
import Heading from './heading';
import { Button } from '@/features/shadcn/ui/button';
import ArrowLeft from '../icons/arrow-left';
import ArrowRight from '../icons/arrow-right';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
    Carousel,
    CarouselItem,
    CarouselContent,
    CarouselNext,
    CarouselPrevious,
} from '@/features/shadcn/ui/carousel';
import { useMedia } from 'react-use';

interface FeaturedItemsCarouselProps
    extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    title?: Maybe<string>;
    viewAllPermalink?: Maybe<string>;
    itemNodes: JSX.Element[];
}

export const FeaturedItemsCarousel = ({
    title,
    viewAllPermalink,
    itemNodes,
    className,
    ...props
}: FeaturedItemsCarouselProps) => {
    const t = useTranslations('common');

    const isMobile = useMedia('(max-width: 767px)', false);
    return (
        <Carousel
            opts={{
                align: () => (isMobile ? 0 : 32),
            }}
            {...props}
            className={cn('flex flex-col gap-y-10', className)}
        >
            <hr className="border-secondary mx-4 md:mx-10" />
            <div className="flex flex-col md:flex-row justify-between gap-4 px-4 md:px-10">
                {title && <Heading variant="heading-5">{title}</Heading>}
                <div className="flex justify-between gap-x-6">
                    {viewAllPermalink && (
                        <Button variant="link" size="none">
                            <Link href={viewAllPermalink}>{t('viewAll')}</Link>
                        </Button>
                    )}
                    <div className="flex gap-x-2">
                        <CarouselPrevious
                            className="rounded-full size-12"
                            size="none"
                        >
                            <ArrowLeft className="size-3" />
                        </CarouselPrevious>
                        <CarouselNext
                            className="rounded-full size-12"
                            size="none"
                        >
                            <ArrowRight className="size-3" />
                        </CarouselNext>
                    </div>
                </div>
            </div>
            <CarouselContent>
                {itemNodes.map((itemNode, index) => (
                    <CarouselItem
                        key={String(index)}
                        className="pl-4
                         md:first-of-type:pl-10 last-of-type:pr-4 md:last-of-type:pr-10"
                    >
                        {itemNode}
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    );
};
