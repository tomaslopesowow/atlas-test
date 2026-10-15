'use client';

import {
    Sheet,
    SheetTitle,
    SheetHeader,
    SheetContent,
    SheetOverlay,
    SheetClose,
} from '@/features/shadcn/ui/sheet';
import { useLocale, useTranslations } from 'next-intl';
import { NavigationOverlay } from './overlay';
import { NavigationButton } from './button';
import Close from '../icons/close';
import { Search } from '../icons/search';
import { Input } from '@/features/shadcn/ui/input';
import { usePayloadAPI } from '@payloadcms/ui';
import { useRef, useState } from 'react';
import type { taxonomyConfigs } from '@/features/payload/features/taxonomies/taxonomies';
import { ImageCMS } from '../content/content-image';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import Link from 'next/link';
import type { MediaImage } from '@/payload-types';
import { formatDate } from '@/utils/format-date';

interface SearchSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchPlaceholder?: string;
    taxonomyTypes?: (keyof typeof taxonomyConfigs)[] | null;
}

const SEARCH_INPUT_TIMEOUT_MS = 800;
const INITIAL_SEARCH_PARAMS = { depth: 1, pagination: false };

export const SearchSheet = ({
    isOpen,
    onOpenChange,
    searchPlaceholder,
    taxonomyTypes,
}: SearchSheetProps) => {
    const t = useTranslations('Search');
    const locale = useLocale();

    const [searchQuery, setSearchQuery] = useState('');

    const [{ data, isError, isLoading }, { setParams }] =
        usePayloadAPI('/api/search');

    const scrollRef = useRef<HTMLDivElement>(null);

    const inputTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;

        if (inputTimeoutRef.current) {
            clearTimeout(inputTimeoutRef.current);
        }

        inputTimeoutRef.current = setTimeout(() => {
            setSearchQuery(query);
            scrollRef.current?.scrollTo({ top: 0 });
            if (!query) return;
            setParams({
                ...INITIAL_SEARCH_PARAMS,
                locale,
                where: {
                    title: { like: query },
                    ...(taxonomyTypes
                        ? { taxonomyType: { in: taxonomyTypes } }
                        : {}),
                },
            });
        }, SEARCH_INPUT_TIMEOUT_MS);
    };

    const hasResults = searchQuery && data?.docs && data.docs.length > 0;
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetOverlay asChild>
                <NavigationOverlay isOpen={isOpen} className="z-[60]" />
            </SheetOverlay>
            <SheetContent className="z-[70] h-svh flex flex-col">
                <SheetHeader className="flex justify-between items-center">
                    <SheetTitle className="sr-only">{t('title')}</SheetTitle>
                    <Search className="size-5" />
                    <Input
                        className="grow"
                        inputClassName="text-primary text-base"
                        placeholder={searchPlaceholder}
                        onChange={handleInputChange}
                    />
                    <SheetClose asChild>
                        <NavigationButton>
                            <Close className="size-3" />
                        </NavigationButton>
                    </SheetClose>
                </SheetHeader>
                <div
                    ref={scrollRef}
                    className="py-8 flex flex-col gap-y-8 px-6 grow overflow-y-scroll"
                    data-lenis-prevent
                >
                    <p className="text-sm text-body">
                        {searchQuery && (
                            <>
                                <span>
                                    {isLoading ? (
                                        <div className="h-3 w-3 bg-secondary animate-pulse inline-block" />
                                    ) : (
                                        data?.docs?.length
                                    )}
                                </span>{' '}
                                {t('results')}{' '}
                                <span className="text-primary">
                                    {searchQuery}
                                </span>
                            </>
                        )}
                    </p>
                    <div className="divide-y gap-y-8 divide-secondary">
                        {isLoading &&
                            Array.from({ length: 5 }).map((_, index) => (
                                <SearchResultSkeleton key={String(index)} />
                            ))}

                        {isError && (
                            <p className="text-sm text-body">{t('error')}</p>
                        )}
                        {hasResults &&
                            data.docs.map((doc: PageWithGenericTaxonomies) => (
                                <SearchResult
                                    key={doc.id}
                                    label={t(doc.taxonomyType)}
                                    {...doc}
                                />
                            ))}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

interface SearchResultProps extends Partial<PageWithGenericTaxonomies> {
    image?: MediaImage;
    label?: string;
    date?: string;
}

const SearchResult = ({
    title,
    image,
    label,
    date,
    permalink,
}: SearchResultProps) => {
    const locale = useLocale();

    const formattedDate = formatDate(date, locale);

    const labelText = [label, formattedDate].filter(Boolean).join(' - ');

    if (!permalink) return null;
    return (
        <div className="py-6 gap-x-4 relative flex first:pt-0">
            <div className="h-20 sm:h-28 aspect-video">
                <ImageCMS
                    sizes="150px"
                    image={image}
                    className="h-full w-full object-cover"
                />
            </div>
            <div className="flex flex-col gap-y-2 justify-between">
                <p className="text-sm">{title}</p>
                <p className="text-xs text-body">{labelText}</p>
            </div>
            <Link href={permalink} className="absolute inset-0" />
        </div>
    );
};

const SearchResultSkeleton = () => {
    return (
        <div className="py-6 gap-x-4 relative flex first:pt-0">
            <div className="bg-secondary h-20 sm:h-28 aspect-video animate-pulse" />
            <div className="flex flex-col gap-y-2 justify-between flex-1">
                <div className="h-4 bg-secondary animate-pulse w-3/4" />
                <div className="h-3 bg-secondary animate-pulse w-1/2" />
            </div>
        </div>
    );
};
