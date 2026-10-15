'use client';

import gsap from 'gsap';
import {
    type ComponentProps,
    type CSSProperties,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useMedia } from 'react-use';
import { AnimatedHeading } from '@/features/animation/components/animated-heading';
import {
    DistortedImageCanvas,
    DistortedImagePlane,
} from '@/features/scene/objects/distorted-image';
import { cn } from '@/features/shadcn/utils/ui';
import type { FleetOverview } from '@/payload-types';
import type { FormattedFleetYacht } from '@/utils/format-yacht';
import Heading from '../common/heading';
import { OverlappingCircles } from '../common/overlapping-circles';
import { LinkCMS } from '../content/content-link';
import { renderLexicalSimple } from '../content/render-lexical-simple';
import ArrowRight from '../icons/arrow-right';

const SPOTLIGHT_ITEM_COLUMN_ATTRIBUTES_DESKTOP: Pick<
    CSSProperties,
    'gridColumnStart' | 'gridColumnEnd' | 'marginTop'
>[] = [
    {
        gridColumnStart: 8,
        gridColumnEnd: 11,
        marginTop: 40,
    },
    {
        gridColumnStart: 1,
        gridColumnEnd: 5,
        marginTop: 0,
    },
    {
        gridColumnStart: 7,
        gridColumnEnd: 13,
        marginTop: 0,
    },
    {
        gridColumnStart: 5,
        gridColumnEnd: 10,
        marginTop: 160,
    },
    {
        gridColumnStart: 1,
        gridColumnEnd: 7,
        marginTop: 160,
    },
    {
        gridColumnStart: 5,
        gridColumnEnd: 9,
        marginTop: 160,
    },
    {
        gridColumnStart: 8,
        gridColumnEnd: 13,
        marginTop: 160,
    },
    {
        gridColumnStart: 1,
        gridColumnEnd: 6,
        marginTop: 60,
    },
    {
        gridColumnStart: 4,
        gridColumnEnd: 10,
        marginTop: 160,
    },
] as const;

const SPOTLIGHT_ITEM_COLUMN_ATTRIBUTES_MOBILE = (
    isOdd: boolean,
): Pick<CSSProperties, 'gridColumnStart' | 'gridColumnEnd' | 'marginTop'> => {
    return {
        gridColumnStart: isOdd ? 1 : 4,
        gridColumnEnd: isOdd ? 10 : 13,
        marginTop: 128,
    };
};

interface SpotlightItemsProps extends ComponentProps<'div'> {
    items: readonly FormattedFleetYacht[];
    onActiveItemIndexChange?: (index: number | null) => void;
    isClone?: boolean;
}

const TEXT_FADE_DURATION_SECONDS = 0.5;
const TEXT_FADE_DELAY_SECONDS = 0.2;
const TEXT_BLUR_RADIUS = 4;

const SpotlightItems = ({
    items,
    className,
    onActiveItemIndexChange,
    isClone,
    ...props
}: SpotlightItemsProps) => {
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const isDesktop = useMedia('(min-width: 1024px)', true);
    const detailsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onActiveItemIndexChange?.(
            isClone && activeItemIndex !== null
                ? activeItemIndex + (items?.length ?? 0)
                : activeItemIndex,
        );
    }, [activeItemIndex, onActiveItemIndexChange, isClone, items?.length]);

    const isPointerDevice = useMedia('(pointer: fine)', true);

    useEffect(() => {
        if (isPointerDevice) {
            gsap.to(detailsRef.current, {
                opacity: 1,
                duration: TEXT_FADE_DURATION_SECONDS,
                delay: TEXT_FADE_DELAY_SECONDS,
            });
        }
    }, [isPointerDevice]);

    return (
        <div className={cn('flex flex-col container', className)} {...props}>
            {items?.map((item, index) => {
                const isOdd = index % 2 === 0;
                if (!item) return null;

                return (
                    <div key={item.id} className="grid grid-cols-12 inset-0">
                        <div
                            className="flex flex-col gap-y-4"
                            style={
                                isDesktop
                                    ? SPOTLIGHT_ITEM_COLUMN_ATTRIBUTES_DESKTOP[
                                          index
                                      ]
                                    : SPOTLIGHT_ITEM_COLUMN_ATTRIBUTES_MOBILE(
                                          isOdd,
                                      )
                            }
                        >
                            {/** biome-ignore lint/a11y/noStaticElementInteractions: This is nicer for accessibility */}
                            <div
                                className="aspect-video relative pointer-chaser-container"
                                onBlur={() => setActiveItemIndex(null)}
                            >
                                <LinkCMS
                                    link={item.link}
                                    disableTitle
                                    className="absolute inset-0 cursor-none"
                                    onMouseOver={() =>
                                        setActiveItemIndex(index)
                                    }
                                    onFocus={() => setActiveItemIndex(index)}
                                    onMouseLeave={() =>
                                        setActiveItemIndex(null)
                                    }
                                />
                                <DistortedImagePlane
                                    className="h-full w-full"
                                    image={item.cover}
                                />
                            </div>
                            <div
                                ref={detailsRef}
                                style={{
                                    transitionDuration: `${TEXT_FADE_DURATION_SECONDS}s`,
                                    transitionDelay: `${TEXT_FADE_DELAY_SECONDS}s`,
                                    ...(isPointerDevice && {
                                        opacity:
                                            activeItemIndex === index ? 1 : 0,
                                    }),
                                }}
                                className="flex flex-col gap-y-6"
                            >
                                <div className="flex gap-x-2">
                                    <div className="h-full aspect-square bg-invert" />
                                    <p className="text-xs font-mono leading-none uppercase">
                                        [
                                        {[
                                            item.year,
                                            item.hull,
                                            item.readableLength,
                                        ]
                                            .filter(Boolean)
                                            .join(' | ')}
                                        ]
                                    </p>
                                </div>
                                <div className="flex flex-col gap-y-4 relative">
                                    <Heading variant="heading-8">
                                        {item.title}
                                    </Heading>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface FleetOverviewSpotlightProps
    extends Omit<FleetOverview, 'spotlightItems'> {
    items: readonly FormattedFleetYacht[];
}

export const FleetOverviewSpotlight = ({
    title,
    items,
}: FleetOverviewSpotlightProps) => {
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [animatedHeadingFinished, setAnimatedHeadingFinished] =
        useState(false);

    return (
        <DistortedImageCanvas activeItemIndex={activeItemIndex}>
            <OverlappingCircles
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-border-primary z-0"
                data-hide-footer
            />
            <AnimatedHeading
                className="text-center fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex"
                variant="display-2"
                onFinished={() => setAnimatedHeadingFinished(true)}
                style={{
                    filter:
                        activeItemIndex === null
                            ? 'none'
                            : `blur(${TEXT_BLUR_RADIUS}px)`,
                    transitionDuration: `${TEXT_FADE_DURATION_SECONDS}s`,
                    transitionDelay: `${TEXT_FADE_DELAY_SECONDS}s`,
                    ...(animatedHeadingFinished && {
                        opacity: activeItemIndex === null ? 1 : 0.2,
                    }),
                }}
                when={'idle'}
            >
                {renderLexicalSimple(title)}
            </AnimatedHeading>
            <SpotlightItems
                items={items}
                onActiveItemIndexChange={setActiveItemIndex}
            />
            <SpotlightItems
                items={items}
                onActiveItemIndexChange={setActiveItemIndex}
                isClone
                className="h-screen overflow-hidden"
            />
            <div className="pointer-chaser">
                <div className="bg-white rounded-full p-4 -translate-x-1/2 -translate-y-1/2">
                    <ArrowRight className="size-3" />
                </div>
            </div>
        </DistortedImageCanvas>
    );
};
