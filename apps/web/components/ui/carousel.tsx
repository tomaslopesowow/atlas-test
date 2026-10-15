'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/utils/ui';
import { useImport } from '@/features/animation/hooks/use-import';
import { Slot } from '@radix-ui/react-slot';
import type useEmblaCarousel from 'embla-carousel-react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

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
    React.HTMLAttributes<HTMLDivElement>;

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
    ...props
}: CarouselCompProps) => {
    const shadowRef = useRef<HTMLDivElement>(null);

    // defer loading the embla carousel module, until the component has entered the viewport
    const [emblaModule] = useImport(
        () => [import('embla-carousel-react')],
        'visible',
        shadowRef,
    );

    // memoize the context provider state to avoid unnecessary rerenders
    const staticState = useMemo(
        () => ({
            opts,
            plugins,
            orientation,
        }),
        [opts, orientation, plugins],
    );

    // create the content node
    const content = (
        <section
            {...props}
            ref={shadowRef}
            aria-roledescription="carousel"
            className={cn('relative', className)}
        >
            {children}
        </section>
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

const CarouselContent = ({ className, ...props }: CarouselCompProps) => {
    const { carouselRef, orientation } = useCarousel();

    return (
        <div ref={carouselRef} className="overflow-hidden">
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
    return <Button disabled={!canScrollPrev} onClick={scrollPrev} {...props} />;
};

CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = ({ ...props }) => {
    const { canScrollNext, scrollNext } = useCarousel();
    return <Button disabled={!canScrollNext} onClick={scrollNext} {...props} />;
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
        <Comp {...props} className={cn(className, 'relative h-px bg-gray-200')}>
            <div
                className="absolute left-0 top-0 h-full bg-green-950"
                style={{ width: 'calc(100% * var(--carousel-progress))' }}
            />
        </Comp>
    );
};

CarouselProgress.displayName = 'CarouselProgress';

export {
    type CarouselApi,
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
    CarouselProgress,
};
