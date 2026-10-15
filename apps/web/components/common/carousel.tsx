'use client';

import { Slot } from '@radix-ui/react-slot';
import { cn } from '@repo/lib/utils/cn';
import { Button } from '@repo/ui/components/button';
import type useEmblaCarousel from 'embla-carousel-react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import { useTranslations } from 'next-intl';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useImport } from '@/features/animation/hooks/use-import';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

export type CarouselProps = {
    opts?: CarouselOptions;
    plugins?: CarouselPlugin;
    orientation?: 'horizontal' | 'vertical';
    setApi?: (api: CarouselApi) => void;
};

type CarouselCompProps = CarouselProps &
    React.RefAttributes<HTMLDivElement> &
    React.HTMLAttributes<HTMLDivElement> & {
        shouldOverflow?: boolean;
    };

type CarouselContextProps = Partial<
    {
        carouselRef: ReturnType<typeof useEmblaCarousel>[0];
        api: ReturnType<typeof useEmblaCarousel>[1];
        scrollPrev: () => void;
        scrollNext: () => void;
        canScrollPrev: boolean;
        canScrollNext: boolean;
    } & CarouselProps
>;

const CarouselContext = createContext<CarouselContextProps | null>(null);

function useCarousel() {
    const context = useContext(CarouselContext);
    if (!context)
        throw new Error('useCarousel must be used within a <Carousel />');
    return context;
}

const Carousel = ({
    opts,
    plugins,
    orientation = 'horizontal',
    children,
    className,
    ref,
    setApi,
    ...props
}: CarouselCompProps) => {
    const shadowRef = useRef<HTMLDivElement>(null);

    const [emblaModule] = useImport(
        () => [import('embla-carousel-react')],
        'idle', // 'visible' gave too much trouble - premature optimization
    );

    // memoize the context provider state to avoid unnecessary rerenders
    const staticState = useMemo(
        () => ({
            opts,
            plugins,
            orientation,
            setApi,
        }),
        [opts, orientation, plugins, setApi],
    );

    // create the content node
    const content = (
        // biome-ignore lint/a11y/useAriaPropsSupportedByRole: This is correct
        <div
            {...props}
            ref={shadowRef}
            aria-roledescription="carousel"
            className={cn('relative', className)}
        >
            {children}
        </div>
    );

    // if the embla module is not loaded yet, provide the static state to the context provider
    if (!emblaModule) {
        return (
            <CarouselContext.Provider value={staticState}>
                <Slot {...props} ref={ref}>
                    {content}
                </Slot>
            </CarouselContext.Provider>
        );
    }

    // if the embla module is loaded, render the interactive carousel
    return (
        <CarouselInner
            {...props}
            ref={ref}
            opts={opts}
            orientation={orientation}
            plugins={plugins}
            setApi={setApi}
            useEmbla={emblaModule.default}
        >
            {content}
        </CarouselInner>
    );
};

Carousel.displayName = 'Carousel';

const CarouselInner = ({
    orientation = 'horizontal',
    opts,
    setApi,
    plugins,
    useEmbla,
    children,
    ref,
}: CarouselCompProps & { useEmbla: typeof useEmblaCarousel }) => {
    const shadowRef = useRef<HTMLDivElement>(null);

    const [carouselRef, api] = useEmbla(
        {
            ...opts,
            axis: orientation === 'horizontal' ? 'x' : 'y',
        },
        plugins,
    );

    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const onSelect = useCallback((api: CarouselApi) => {
        if (!api) return;
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);

    const scrollPrev = useCallback(() => {
        api?.scrollPrev();
    }, [api]);

    const scrollNext = useCallback(() => {
        api?.scrollNext();
    }, [api]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                scrollPrev();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                scrollNext();
            }
        },
        [scrollPrev, scrollNext],
    );

    useEffect(() => {
        if (!api || !setApi) return;
        setApi(api);
    }, [api, setApi]);

    useEffect(() => {
        if (!api) return;

        const handleScroll = (carousel: typeof api) => {
            shadowRef.current?.style.setProperty(
                '--carousel-progress',
                `${Math.max(0, Math.min(1, carousel.scrollProgress()))}`,
            );
        };

        api.on('scroll', handleScroll);
    }, [api]);

    useEffect(() => {
        if (!api) return;

        onSelect(api);
        api.on('reInit', onSelect);
        api.on('select', onSelect);

        return () => {
            api?.off('select', onSelect);
        };
    }, [api, onSelect]);

    return (
        <CarouselContext.Provider
            value={{
                carouselRef,
                api,
                opts,
                orientation,
                scrollPrev,
                scrollNext,
                canScrollPrev,
                canScrollNext,
            }}
        >
            <Slot ref={ref} onKeyDownCapture={handleKeyDown}>
                {children}
            </Slot>
        </CarouselContext.Provider>
    );
};

CarouselInner.displayName = 'CarouselInner';

const CarouselContent = ({
    className,
    shouldOverflow = false,
    ...props
}: CarouselCompProps) => {
    const { carouselRef, orientation } = useCarousel();

    return (
        <div
            ref={carouselRef}
            className={cn(!shouldOverflow && 'overflow-hidden')}
        >
            <div
                className={cn(
                    'flex',
                    orientation === 'vertical' && 'flex-col',
                    className,
                )}
                {...props}
            />
        </div>
    );
};

CarouselContent.displayName = 'CarouselContent';

const CarouselItem = ({ className, ...props }: CarouselCompProps) => {
    return (
        // biome-ignore lint/a11y/useSemanticElements: This is correct
        <div
            aria-roledescription="slide"
            className={cn('min-w-0 shrink-0 grow-0', className)}
            role="group"
            {...props}
        />
    );
};

CarouselItem.displayName = 'CarouselItem';

const CarouselPrevious = ({ ...props }) => {
    const { canScrollPrev, scrollPrev } = useCarousel();
    const t = useTranslations('common');
    return (
        <Button
            disabled={!canScrollPrev}
            onClick={scrollPrev}
            aria-label={t('previous')}
            {...props}
        />
    );
};

CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = ({ ...props }) => {
    const { canScrollNext, scrollNext } = useCarousel();
    const t = useTranslations('common');
    return (
        <Button
            disabled={!canScrollNext}
            onClick={scrollNext}
            aria-label={t('next')}
            {...props}
        />
    );
};

CarouselNext.displayName = 'CarouselNext';

const CarouselProgress = ({
    asChild,
    className,
    ...props
}: CarouselCompProps & { asChild?: boolean }) => {
    const Comp = asChild ? Slot : 'div';

    // use carousel as a side effect to validate if its used within <Carousel>
    useCarousel();

    return (
        <Comp
            {...props}
            className={cn('relative h-px bg-gray-background2', className)}
        >
            <div
                className="absolute left-0 top-0 h-full bg-text-gray12"
                style={{ width: 'calc(100% * var(--carousel-progress))' }}
            />
        </Comp>
    );
};

// Debounce because the scroll event is fired too often
const SCROLL_DEBOUNCE = 500; // ms

const CarouselDots = ({
    className,
    dotClassName,
}: {
    className?: string;
    dotClassName?: string;
}) => {
    const { api } = useCarousel();
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleClick = useCallback(
        (index: number) => {
            api?.scrollTo(index);
        },
        [api],
    );

    useEffect(() => {
        if (!api) return;

        let timeout: ReturnType<typeof setTimeout>;

        const scrollHandler = () => {
            if (timeout != null) clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (api.selectedScrollSnap() === selectedIndex) return;
                setSelectedIndex(api.selectedScrollSnap() ?? 0);
            }, SCROLL_DEBOUNCE);
        };

        const selectHandler = () => {
            setSelectedIndex(api.selectedScrollSnap() ?? 0);
        };

        api.on('scroll', scrollHandler);
        api.on('select', selectHandler);

        return () => {
            api.off('scroll', scrollHandler);
            api.off('select', selectHandler);
            clearTimeout(timeout);
        };
    }, [api, selectedIndex]);

    return (
        <div
            className={cn(
                'flex gap-2 absolute bottom-0 left-1/2 -translate-x-1/2',
                className,
            )}
        >
            {api?.slideNodes().map((_, index) => {
                return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: Should a button be used?
                    <div
                        key={String(index)}
                        className={cn(
                            'h-2 w-2 bg-primary opacity-40 data-[state=active]:opacity-100',
                            dotClassName,
                        )}
                        onClick={() => handleClick(index)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleClick(index);
                            }
                        }}
                        data-state={
                            selectedIndex === index ? 'active' : 'inactive'
                        }
                    />
                );
            })}
        </div>
    );
};

CarouselProgress.displayName = 'CarouselProgress';

export {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselDots,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    CarouselProgress,
};
