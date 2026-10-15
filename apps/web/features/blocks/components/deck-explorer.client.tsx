'use client';

import Heading from '@/components/common/heading';
import { SegmentedControl } from '@/components/common/segmented-control';
import { ImageCMS } from '@/components/content/content-image';
import type { DeckExplorer } from '@/payload-types';
import { useState } from 'react';
import {
    Sheet,
    SheetTitle,
    SheetContent,
    SheetClose,
} from '../../shadcn/ui/sheet';
import { StyledDivider } from '@/components/common/styled-divider';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { cn } from '../../shadcn/utils/ui';
import { isRichTextEmpty } from '@/utils/is-richtext-empty';
import { ArrowRight } from 'lucide-react';
import {
    TooltipContent,
    Root as TooltipRoot,
    TooltipTrigger,
} from '@radix-ui/react-tooltip';
import { Button } from '../../shadcn/ui/button';
import ArrowLeft from '@/components/icons/arrow-left';
import Close from '@/components/icons/close';

export const DeckExplorerClient = ({ items, title }: DeckExplorer) => {
    const [activeDeckIndex, setActiveDeckIndex] = useState<number>(0);
    const [activeHighlightIndex, setActiveHighlightIndex] = useState<
        number | null
    >(null);
    const [sheetOpen, setSheetOpen] = useState<boolean>(false);

    const handleHighlightClick = (index: number) => {
        setActiveHighlightIndex(index);
        setSheetOpen(true);
    };

    const handleClose = () => {
        setSheetOpen(false);
    };
    if (!items) return null;

    const activeHighlightItem =
        activeHighlightIndex !== null
            ? items[activeDeckIndex]?.highlights?.[activeHighlightIndex]
            : null;

    const segmentedControlOptions =
        items.map((item, index) => ({
            label: item.deckName,
            value: index,
        })) ?? [];

    return (
        <>
            <section className="relative min-h-svh flex flex-col gap-y-10 md:gap-y-28 items-center justify-between py-20 md:py-32 bg-secondary">
                <Heading variant="heading-4" className="z-20">
                    {title}
                </Heading>
                <div className="relative h-64 md:h-96 w-full overflow-hidden">
                    {items.map(({ deckImage, highlights, id }, index) => (
                        <div
                            key={`deck-${id}-${String(index)}`}
                            className={cn(
                                'transition-opacity opacity-0 pointer-events-none duration-500 absolute left-1/2 -translate-x-1/2 h-full w-[80rem]',
                                {
                                    'opacity-100 pointer-events-auto':
                                        index === activeDeckIndex,
                                },
                            )}
                        >
                            <ImageCMS
                                key={id}
                                image={deckImage}
                                className="!object-contain h-full w-full"
                            />
                            {highlights?.map(
                                ({ position, id, title }, index) => (
                                    <Marker
                                        key={id}
                                        title={title}
                                        position={position}
                                        onClick={() =>
                                            handleHighlightClick(index)
                                        }
                                    />
                                ),
                            )}
                        </div>
                    ))}
                </div>
                <SegmentedControl
                    className="hidden md:flex"
                    options={segmentedControlOptions}
                    value={0}
                    onChange={(value) => {
                        setActiveDeckIndex(value);
                    }}
                />
                <div className="md:hidden flex w-full justify-between items-center gap-x-2 px-4">
                    <Button
                        size="md"
                        className="rounded-full"
                        onClick={() =>
                            setActiveDeckIndex((prev) =>
                                prev - 1 < 0 ? items.length - 1 : prev - 1,
                            )
                        }
                    >
                        <ArrowLeft className="size-3" />
                    </Button>
                    <Heading variant="base" as="p">
                        {items[activeDeckIndex]?.deckName}
                    </Heading>
                    <Button
                        size="md"
                        className="rounded-full"
                        onClick={() =>
                            setActiveDeckIndex(
                                (prev) => (prev + 1) % items.length,
                            )
                        }
                    >
                        <ArrowRight className="size-3" />
                    </Button>
                </div>
            </section>
            <Sheet open={sheetOpen} onOpenChange={handleClose}>
                {activeHighlightIndex !== null && (
                    <SheetContent>
                        <div className="flex flex-col md:z-20 h-full bg-primary relative">
                            <ImageCMS
                                image={activeHighlightItem?.image}
                                className="w-full h-[40%]"
                            />
                            <div className="h-full flex flex-col p-10 lg:p-20 justify-center items-center gap-y-10 text-center">
                                <SheetTitle variant="heading-6">
                                    {activeHighlightItem?.title}
                                </SheetTitle>
                                {activeHighlightItem?.simpleRichText &&
                                    !isRichTextEmpty(
                                        activeHighlightItem?.simpleRichText,
                                    ) && (
                                        <>
                                            <StyledDivider />
                                            <p className="text-sm md:text-base">
                                                {renderLexicalSimple(
                                                    items[activeDeckIndex]
                                                        ?.highlights?.[
                                                        activeHighlightIndex
                                                    ].simpleRichText,
                                                )}
                                            </p>
                                        </>
                                    )}
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

const Marker = ({
    position,
    title,
    onClick,
}: {
    position: { x: number; y: number };
    title: string;
    onClick: () => void;
}) => {
    return (
        <TooltipRoot>
            <div
                className="absolute size-6"
                style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                }}
            >
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onClick}
                        className="size-full rounded-full bg-invert absolute"
                    />
                </TooltipTrigger>
                <div className="size-full rounded-full bg-invert animate-ping pointer-events-none" />
            </div>
            <TooltipContent
                sideOffset={8}
                className="bg-primary px-5 py-3 animate-fade-in leading-none hidden pointer-fine:block"
            >
                <Heading className="text-xs leading-none" variant="base">
                    {title}
                </Heading>
            </TooltipContent>
        </TooltipRoot>
    );
};
