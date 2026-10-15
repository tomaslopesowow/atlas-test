'use client';
import Heading, { type HeadingVariantProps } from '@/components/common/heading';
import { MediaCMS } from '@/components/content/content-media';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import { Button } from '@/features/shadcn/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/features/shadcn/ui/sheet';
import { cn } from '@/features/shadcn/utils/ui';
import type { MediaField } from '@/payload-types';
import type { Maybe } from '@/utils/maybe';
import type { TypedEditorState } from '@payloadcms/richtext-lexical';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import Close from '../icons/close';
import { getNoiseOffsetAtY, CONFIG } from './shared';
import { useMotion } from '@/features/animation/hooks/use-motion';

type BuildProcessData = NonNullable<
    PageWithGenericTaxonomies<'buildProcess'>['taxonomyData']['buildProcess']
>;

type StorylineContentProps = {
    parts: BuildProcessData['parts'];
    stepName: BuildProcessData['step'];
};

type SheetContentType = {
    partIndex: number;
    stepName: BuildProcessData['step'];
    title?: Maybe<string>;
    items: {
        title?: Maybe<string>;
        media?: Maybe<MediaField>;
        content?: Maybe<TypedEditorState>;
    }[];
};

type IndicatorPosition = {
    x: number;
    y: number;
};

const PATH_SELECTOR = '[data-storyline-path]';

export const StorylineContent = ({
    parts,
    stepName,
}: StorylineContentProps) => {
    const [sheetOpen, setSheetOpen] = useState<boolean>(false);
    const [sheetContent, setSheetContent] = useState<SheetContentType | null>(
        null,
    );
    const t = useTranslations();

    const containerRef = useRef<HTMLDivElement>(null);
    const partRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [indicatorPositions, setIndicatorPositions] = useState<
        IndicatorPosition[]
    >([]);

    // Align the indicators to the path on the X axis, based on their Y position
    useMotion(
        () => {
            const container = containerRef.current;
            const pathSvg = document.querySelector(PATH_SELECTOR);
            if (!container || !pathSvg || !parts) return;

            const containerRect = container.getBoundingClientRect();
            const pathRect = pathSvg.getBoundingClientRect();

            const pathCenterX =
                pathRect.left - containerRect.left + pathRect.width / 2;
            const maxAmplitude = pathRect.width / 2;

            const positions: IndicatorPosition[] = [];

            partRefs.current.forEach((partEl) => {
                if (!partEl) return;

                const partRect = partEl.getBoundingClientRect();
                // Y relative to path (for noise calculation - must match path's coordinate system)
                const noiseY = partRect.top - pathRect.top;
                // Y relative to content container (for CSS positioning)
                const positionY = partRect.top - containerRect.top;

                const noiseOffset = getNoiseOffsetAtY(noiseY, maxAmplitude);
                const x = pathCenterX + noiseOffset;

                positions.push({ x, y: positionY });
            });

            setIndicatorPositions(positions);
        },
        {
            load: {
                when: 'visible',
                ref: containerRef,
            },
            loader: () => [new Promise((resolve) => resolve(true))],
            observeWindowResize: () => true,
        },
    );

    const handleClick = (partIndex: number, itemIndex: number) => {
        const items = parts?.[partIndex]?.items?.[itemIndex]?.sheet?.items;
        const title = parts?.[partIndex]?.items?.[itemIndex]?.title;
        if (!items || !items?.length) return;
        setSheetContent({
            partIndex,
            stepName,
            title,
            items,
        });

        setSheetOpen(true);
    };

    if (!parts) return null;
    return (
        <>
            <div
                ref={containerRef}
                data-parts-container
                className="flex flex-col gap-y-20 lg:gap-y-0 relative"
            >
                {indicatorPositions.map((pos, index) => (
                    <div
                        key={`indicator-${String(index)}`}
                        className="absolute pointer-events-none hidden lg:flex items-center gap-x-4"
                        style={{
                            left: pos.x,
                            top: pos.y,
                            transform: `translate(-50%, -${CONFIG.PART_INDICATOR_SIZE_PX / 2}px)`,
                        }}
                    >
                        <span
                            className={cn(
                                'uppercase font-sweet-sans-pro text-sm text-primary whitespace-nowrap absolute',
                                index % 2 === 0
                                    ? 'left-full ml-8'
                                    : 'right-full mr-8',
                            )}
                        >
                            {t('common.part')} {index + 1}
                        </span>
                        <div
                            className="bg-invert rounded-full"
                            style={{
                                width: CONFIG.PART_INDICATOR_SIZE_PX * 2,
                                height: CONFIG.PART_INDICATOR_SIZE_PX * 2,
                            }}
                        />
                        <div
                            className="absolute border border-invert rounded-full"
                            style={{
                                width:
                                    (CONFIG.PART_INDICATOR_SIZE_PX +
                                        CONFIG.PART_INDICATOR_BORDER_OFFSET_PX) *
                                    2,
                                height:
                                    (CONFIG.PART_INDICATOR_SIZE_PX +
                                        CONFIG.PART_INDICATOR_BORDER_OFFSET_PX) *
                                    2,
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    </div>
                ))}

                {parts.map((part, partIndex) => {
                    const previousCount = parts
                        .slice(0, partIndex)
                        .reduce(
                            (sum, part) => sum + (part.items?.length ?? 0),
                            0,
                        );

                    const partStartsOdd = previousCount % 2 === 1;

                    return (
                        <div
                            key={part.id}
                            ref={(el) => {
                                partRefs.current[partIndex] = el;
                            }}
                            className="flex flex-col relative gap-y-20"
                            data-part={partIndex}
                        >
                            {part.items?.map((item, itemIndex) => {
                                const isOdd =
                                    (partStartsOdd ? 1 : 0) ^ (itemIndex % 2);

                                return (
                                    <div
                                        className="grid grid-cols-12"
                                        key={item.id}
                                    >
                                        <div
                                            className={cn(
                                                'col-span-8 lg:col-span-4 flex flex-col gap-y-6 lg:gap-y-12 col-start-5',
                                                isOdd
                                                    ? 'lg:col-start-1'
                                                    : 'lg:col-start-9',
                                            )}
                                        >
                                            <MediaCMS
                                                media={item.media}
                                                className="w-full aspect-video"
                                            />
                                            <div className="flex flex-col gap-y-3 lg:gap-y-8">
                                                <Heading
                                                    variant={
                                                        item.variant as HeadingVariantProps['variant']
                                                    }
                                                >
                                                    {item.title}
                                                </Heading>
                                                <p className="text-sm lg:text-base text-body">
                                                    {renderLexicalSimple(
                                                        item.description,
                                                    )}
                                                </p>
                                            </div>
                                            {item.sheet?.enabled && (
                                                <Button
                                                    onClick={() =>
                                                        handleClick(
                                                            partIndex,
                                                            itemIndex,
                                                        )
                                                    }
                                                >
                                                    {item.sheet.linkTitle}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                {sheetContent && (
                    <SheetContent className="flex">
                        <div
                            className="flex flex-col py-10 px-4 md:px-10 gap-y-20 md:gap-y-32 overflow-y-scroll grow md:z-20 bg-primary"
                            data-lenis-prevent
                        >
                            <SheetHeader className="flex justify-between p-0 border-none">
                                <SheetTitle variant="base">
                                    {`${t('common.part')} ${String(sheetContent.partIndex + 1).padStart(2, '0')}`}
                                </SheetTitle>
                                <Heading
                                    className="hidden md:block"
                                    variant="base"
                                >
                                    {t(`BuildProcess.${sheetContent.stepName}`)}
                                </Heading>
                            </SheetHeader>
                            <div className="flex flex-col gap-y-6">
                                <Heading variant="heading-5">
                                    {sheetContent.title}
                                </Heading>
                                <div className="flex flex-col gap-y-20 md:gap-y-32">
                                    {sheetContent.items.map(
                                        (item, itemIndex) => (
                                            <div
                                                key={String(itemIndex)}
                                                className="flex flex-col gap-y-6 md:gap-y-10"
                                            >
                                                <MediaCMS
                                                    media={item.media}
                                                    className="w-full aspect-video"
                                                />
                                                <div className="flex flex-col gap-y-3 md:gap-y-4">
                                                    <Heading variant="heading-6">
                                                        {item.title}
                                                    </Heading>
                                                    <p className="text-sm lg:text-base">
                                                        {renderLexicalSimple(
                                                            item.content,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                        <SheetClose
                            className={cn(
                                'absolute top-4 md:top-1/2 size-12 right-4 md:right-[calc(100%-3.5rem)] bg-primary rounded-full flex items-center justify-center md:z-10',
                                {
                                    'md:animate-slide-out-left': sheetOpen,
                                    'md:animate-slide-in-left': !sheetOpen,
                                },
                            )}
                        >
                            <Close className="size-3" />
                        </SheetClose>
                    </SheetContent>
                )}
            </Sheet>
        </>
    );
};
