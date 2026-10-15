'use client';

import { Slot } from '@radix-ui/react-slot';
import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
    FILTER_OPTIONS,
    PRICE_FILTER_OPTION,
    RESALE_SORT_OPTIONS,
    type LAYOUT_MODES,
    type OverviewFilters,
} from '@/components/common/filter-shared';
import { FilterSheet, type SortOption } from '@/components/common/filter-sheet';
import { Button } from '@/features/shadcn/ui/button';
import Input from '@/features/shadcn/ui/input';
import { cn } from '@/features/shadcn/utils/ui';
import type { ResaleList } from '@/payload-types';
import type { FormattedResaleYacht } from '@/utils/format-yacht';
import { Heading } from '@/components/common/heading';
import { Pagination } from '@/components/common/pagination';
import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import Close from '@/components/icons/close';
import { Filter } from '@/components/icons/filter';
import Search from '@/components/icons/search';
import { YachtCard } from '@/components/common/yacht-card';
import { useRouter } from 'next/navigation';

const RESALE_FILTER_OPTIONS = [...FILTER_OPTIONS, PRICE_FILTER_OPTION];
const formatFilterValue = (key: string, value: number) => {
    const option = RESALE_FILTER_OPTIONS.find((o) => o.name === key);
    return option?.formatDisplayValue
        ? option.formatDisplayValue(value)
        : value;
};
const ITEM_IMAGE_ANIMATION_DELAY_SECONDS = 0.3;

interface ResaleListClientProps extends ResaleList {
    className?: string;
    items: FormattedResaleYacht[];
    layoutMode: (typeof LAYOUT_MODES)[number];
    sort?: string;
    filters?: OverviewFilters;
    search?: string;
    currentPage: number;
    totalPages: number;
    totalDocs: number;
}

export const ResaleListClient = ({
    items,
    className,
    title,
    layoutMode,
    currentPage,
    totalPages,
    totalDocs,
    ...props
}: ResaleListClientProps) => {
    const t = useTranslations('Filter');
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: t is stable
    const sortOptions = useMemo(
        () =>
            RESALE_SORT_OPTIONS.map<SortOption>((option) => ({
                name: option,
                label: t(option),
            })),
        [],
    );

    function handleLayoutChange(mode: (typeof LAYOUT_MODES)[number]) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('layoutMode', mode);
        router.push(nextUrl.href);
    }

    function handlePageChange(page: number) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('page', page.toString());
        router.push(nextUrl.href);
    }

    function handleFilterSubmit({
        filters,
        sort,
    }: {
        filters: OverviewFilters;
        sort?: string;
    }) {
        const nextUrl = new URL(window.location.href);

        for (const option of RESALE_FILTER_OPTIONS) {
            nextUrl.searchParams.delete(`${option.name}Min`);
            nextUrl.searchParams.delete(`${option.name}Max`);
        }

        for (const [filterKey, [min, max]] of Object.entries(filters)) {
            nextUrl.searchParams.set(`${filterKey}Min`, min.toString());
            nextUrl.searchParams.set(`${filterKey}Max`, max.toString());
        }

        if (sort) {
            nextUrl.searchParams.set('sort', sort);
        } else {
            nextUrl.searchParams.delete('sort');
        }

        router.push(nextUrl.href);
    }

    function handleSearchSubmit() {
        const nextUrl = new URL(window.location.href);

        if (inputRef.current?.value) {
            nextUrl.searchParams.set('search', inputRef.current.value);
        } else {
            nextUrl.searchParams.delete('search');
        }

        router.push(nextUrl.href);
    }

    function handleClearAll() {
        const nextUrl = new URL(window.location.href);

        for (const option of RESALE_FILTER_OPTIONS) {
            nextUrl.searchParams.delete(`${option.name}Min`);
            nextUrl.searchParams.delete(`${option.name}Max`);
        }

        nextUrl.searchParams.delete('sort');
        nextUrl.searchParams.delete('search');

        router.push(nextUrl.href);
    }

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div
                className={cn(
                    'px-4 sm:px-10 flex flex-col gap-y-10 md:gap-y-20 pb-40',
                    'max-sm:pt-[calc(var(--navigation-height)_+_2.5rem)]',
                    'sm:pt-[calc(var(--navigation-height)_+_5rem)]',
                    className,
                )}
            >
                <div className="flex justify-between sm:items-end flex-col sm:flex-row gap-8">
                    <div className="flex gap-x-1">
                        <Heading variant="heading-3" className="leading-none">
                            {title}
                        </Heading>
                        <p className="font-mono text-xs leading-none">
                            [{totalDocs}]
                        </p>
                    </div>
                    <div className="flex gap-x-3">
                        <Button
                            variant="tertiary"
                            size="none"
                            onClick={() => handleLayoutChange('grid')}
                            data-active={layoutMode === 'grid'}
                        >
                            {t('grid')}
                        </Button>
                        <Button
                            variant="tertiary"
                            size="none"
                            onClick={() => handleLayoutChange('list')}
                            data-active={layoutMode === 'list'}
                        >
                            {t('list')}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-y-10">
                    <div className="flex flex-col gap-y-6">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearchSubmit();
                            }}
                            className="flex flex-col md:flex-row gap-8"
                        >
                            <div className="flex gap-x-4 border-b border-primary pb-6 grow">
                                <Search className="size-4" />
                                <Input
                                    placeholder={t('searchPlaceholder')}
                                    defaultValue={props.search}
                                    ref={inputRef}
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="none"
                                className="gap-x-2"
                                onClick={() => setIsModalOpen(true)}
                                type="button"
                            >
                                <Filter />
                                <span>{t('filterAndSort')}</span>
                            </Button>
                        </form>

                        <div className="flex justify-between md:items-center flex-col md:flex-row gap-2">
                            <div className="flex gap-2 flex-wrap">
                                {props.filters &&
                                    Object.entries(props.filters).map(
                                        ([key, [min, max]]) => (
                                            <Button
                                                key={key}
                                                variant="ghost"
                                                size="none"
                                                className="bg-surface-primary text-xs px-3 py-2 gap-x-3"
                                                type="button"
                                                onClick={() => {
                                                    const next = {
                                                        ...props.filters,
                                                    };
                                                    delete next[key];
                                                    handleFilterSubmit({
                                                        filters: next,
                                                        sort: props.sort,
                                                    });
                                                }}
                                            >
                                                <span>
                                                    {t(key)}:{' '}
                                                    {formatFilterValue(
                                                        key,
                                                        min,
                                                    )}{' '}
                                                    -{' '}
                                                    {formatFilterValue(
                                                        key,
                                                        max,
                                                    )}
                                                </span>
                                                <Close className="size-2" />
                                            </Button>
                                        ),
                                    )}

                                {props.search && (
                                    <Button
                                        variant="ghost"
                                        size="none"
                                        className="bg-surface-primary text-xs px-3 py-2 gap-x-3"
                                        type="button"
                                        onClick={() => {
                                            if (inputRef.current) {
                                                inputRef.current.value = '';
                                                handleSearchSubmit();
                                            }
                                        }}
                                    >
                                        <span>
                                            {t('search')}: "{props.search}"
                                        </span>
                                        <Close className="size-2" />
                                    </Button>
                                )}
                            </div>
                            {((props.filters &&
                                Object.keys(props.filters).length > 0) ||
                                props.search) && (
                                <Button
                                    variant="ghost"
                                    size="none"
                                    className="bg-surface-primary text-xs px-3 py-2 gap-x-3"
                                    type="button"
                                    onClick={handleClearAll}
                                >
                                    {t('clearAll')}
                                    <Close className="size-2" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {layoutMode === 'grid' && <GridLayout items={items} />}
                    {layoutMode === 'list' && <ListLayout items={items} />}
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onChange={handlePageChange}
                />
            </div>

            <FilterSheet
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                filterOptions={RESALE_FILTER_OPTIONS}
                filters={props.filters ?? {}}
                sortOptions={sortOptions}
                sort={props.sort}
                onSubmit={handleFilterSubmit}
            />
        </>
    );
};

const GridLayout = ({ items }: { items: readonly FormattedResaleYacht[] }) => (
    <div className="grid grid-cols-12 gap-x-4 gap-y-8 sm:gap-y-12">
        {items.map((item, index) => (
            <YachtCard
                key={`${item.id}-grid-${index}`}
                {...item}
                className="col-span-12 sm:col-span-6 md:col-span-4"
            />
        ))}
    </div>
);

const ListLayout = ({ items }: { items: readonly FormattedResaleYacht[] }) => {
    const t = useTranslations('Filter');

    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(
        null,
    );
    const imageAnimationTimeoutRef = useRef<number | null>(null);

    const imageRefs = useRef<HTMLElement[]>([]);
    const zIndexCounter = useRef(1);

    useEffect(() => {
        if (activeImageIndex == null) {
            const images = gsap.utils.toArray(
                imageRefs.current,
            ) as HTMLElement[];
            gsap.to(images, {
                clipPath: 'inset(0 0 100% 0)',
            }).then(() => {
                gsap.set(images, {
                    opacity: 0,
                });
            });
            return;
        }

        zIndexCounter.current += 1;
        gsap.set(imageRefs.current[activeImageIndex], {
            zIndex: zIndexCounter.current,
            opacity: 1,
        });

        gsap.fromTo(
            imageRefs.current[activeImageIndex],
            { clipPath: 'inset(0 0 100% 0)' },
            {
                clipPath: 'inset(0 0 0% 0)',
                ease: 'power4.out',
                duration: 0.8,
            },
        );
    }, [activeImageIndex]);

    useEffect(() => {
        if (imageAnimationTimeoutRef.current !== null) {
            clearTimeout(imageAnimationTimeoutRef.current);
            imageAnimationTimeoutRef.current = null;
        }

        imageAnimationTimeoutRef.current = window.setTimeout(() => {
            setActiveImageIndex(activeItemIndex);
        }, ITEM_IMAGE_ANIMATION_DELAY_SECONDS * 1000);

        return () => {
            if (imageAnimationTimeoutRef.current !== null) {
                clearTimeout(imageAnimationTimeoutRef.current);
                imageAnimationTimeoutRef.current = null;
            }
        };
    }, [activeItemIndex]);

    return (
        <div className="flex flex-col divide-y divide-border-primary border-b border-primary">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 font-mono text-2xs uppercase pb-4">
                <p>{t('name')}</p>
                <p className="hidden sm:block">{t('year')}</p>
                <p className="hidden lg:block">{t('length')}</p>
                <p className="hidden lg:block">{t('price')}</p>
            </div>
            {items.map((item, index) => (
                <Fragment key={item.id}>
                    {/** biome-ignore lint/a11y/noStaticElementInteractions: This is nicer for accessibility */}
                    <div
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 py-8 relative"
                        key={`${item.id}-list-${index}`}
                        onMouseLeave={() => setActiveItemIndex(null)}
                        onBlur={() => setActiveItemIndex(null)}
                    >
                        <div
                            style={{
                                transitionTimingFunction:
                                    'cubic-bezier(0,0,0,1)',
                            }}
                            className={cn(
                                'absolute bottom-0 left-0 w-0 h-px bg-invert',
                                activeItemIndex === index
                                    ? 'w-full transition-none'
                                    : 'transition-all duration-1000',
                            )}
                        />
                        <LinkCMS
                            className="absolute inset-0 z-10"
                            link={item.link}
                            disableTitle
                            onFocus={() => setActiveItemIndex(index)}
                            onMouseOver={() => setActiveItemIndex(index)}
                        />
                        <Heading variant="base">{item.title}</Heading>
                        <p className="font-thin text-body hidden sm:block">
                            {item.year}
                        </p>
                        <p className="font-thin text-body hidden lg:block">
                            {item.readableLength}
                        </p>
                        <p className="font-thin text-body hidden lg:block">
                            {item.price}
                        </p>
                    </div>
                    <Slot
                        ref={(el) => {
                            if (!el) return;
                            imageRefs.current[index] = el;
                        }}
                    >
                        <ImageCMS
                            image={item.cover}
                            className="w-80 aspect-video bottom-10 right-10 fixed opacity-0 hidden lg:block"
                        />
                    </Slot>
                </Fragment>
            ))}
        </div>
    );
};
