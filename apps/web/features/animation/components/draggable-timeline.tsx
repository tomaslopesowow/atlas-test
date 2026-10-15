'use client';

import { cn } from '@/features/shadcn/utils/ui';
import type { TimelineData } from '@/types/shared';
import { useRef, type ComponentProps } from 'react';
import { useMotion } from '../hooks/use-motion';
import { useSmoothScroll } from './smooth-scroll-context';
import { getMousePosition } from '../utils/pointer';
import { createPhysicsBasedMotion } from '../utils/second-order-dynamics';
import Heading from '@/components/common/heading';

type DraggableTimelineProps = ComponentProps<'div'> & {
    data: TimelineData;
};

const LINE_INTERVAL = 10;
const LINE_HEIGHT = 1;

const PHYSICS = [1.5, 0.8, -0.2, 0];
const ROUNDING_THRESHOLD = 0.001;

const SCROLL_FACTOR = 0.8;

const HOVER_LINE_WIDTH = 40;
const ACTIVE_LINE_WIDTH = 32;
const SEMI_ACTIVE_LINE_WIDTH = 14;
const DEFAULT_LINE_WIDTH = 10;

const splitYear = (year: number): [string, string] => {
    const yearString = year.toString();
    const centuryPart = yearString.slice(0, 2);
    const yearPart = yearString.slice(2);
    return [centuryPart, yearPart];
};

export const DraggableTimeline = ({
    data,
    className,
    style,
    ...props
}: DraggableTimelineProps) => {
    const timelineRef = useRef<HTMLDivElement>(null);

    const { scrollTo } = useSmoothScroll();

    const { centuryParts, yearParts } = data.items.reduce(
        (acc: { centuryParts: string[]; yearParts: string[] }, item) => {
            const [centuryPart, yearPart] = splitYear(item.year);

            const lastCentury = acc.centuryParts.at(-1);
            const lastYear = acc.yearParts.at(-1);

            if (lastCentury === centuryPart && lastYear === yearPart)
                return acc;

            if (lastCentury !== centuryPart) {
                acc.centuryParts.push(centuryPart);
            }

            acc.yearParts.push(yearPart);

            return acc;
        },
        { centuryParts: [], yearParts: [] },
    );

    useMotion(
        ([{ default: gsap }]) => {
            if (!timelineRef.current) return;

            const context = gsap.context(() => {}, timelineRef.current);

            const dragIndicator = timelineRef.current.querySelector(
                '#timeline-draggable',
            ) as HTMLElement | null;

            const lineElements = Array.from(
                timelineRef.current.querySelectorAll(
                    '[data-timeline-lines] > line',
                ),
            ) as HTMLElement[];

            const dragPhysics = createPhysicsBasedMotion(...PHYSICS);

            const containerTop =
                timelineRef.current.getBoundingClientRect().top +
                window.scrollY;

            let dragOffsetY = window.innerHeight / 2;
            let easedDragOffsetY = 0;
            let isDragging = false;

            const centuryContainer =
                timelineRef.current.querySelector('[data-centuries]');
            const yearContainer =
                timelineRef.current.querySelector('[data-years]');

            const itemIndices: {
                yearIndex: number;
                centuryIndex: number;
            }[] = [];

            let currentYearIndex = -1;
            let currentCenturyIndex = -1;
            let lastCentury = '';
            let lastYear = '';
            for (const item of data.items) {
                const [centuryPart, yearPart] = splitYear(item.year);
                if (lastCentury === centuryPart && lastYear === yearPart) {
                    itemIndices.push({
                        yearIndex: currentYearIndex,
                        centuryIndex: currentCenturyIndex,
                    });
                    continue;
                }
                if (lastCentury !== centuryPart) {
                    currentCenturyIndex++;
                    lastCentury = centuryPart;
                }
                currentYearIndex++;
                lastYear = yearPart;
                itemIndices.push({
                    yearIndex: currentYearIndex,
                    centuryIndex: currentCenturyIndex,
                });
            }

            // Initialize to current scroll position so we don't
            // tween from 0 after a resize
            const initialScrollCenter = window.scrollY + window.innerHeight / 2;
            let initialItemIndex = 0;
            for (let i = data.items.length - 1; i >= 0; i--) {
                if (data.items[i].topPx <= initialScrollCenter) {
                    initialItemIndex = i;
                    break;
                }
            }
            const initialIndices = itemIndices[initialItemIndex];

            let previousYearIndex = initialIndices.yearIndex;
            let previousCenturyIndex = initialIndices.centuryIndex;

            if (yearContainer) {
                gsap.set(yearContainer, {
                    yPercent: -(previousYearIndex / yearParts.length) * 100,
                });
            }
            if (centuryContainer) {
                gsap.set(centuryContainer, {
                    yPercent:
                        -(previousCenturyIndex / centuryParts.length) * 100,
                });
            }

            const updateYearIndicator = () => {
                const scrollCenter = window.scrollY + window.innerHeight / 2;

                let currentItemIndex = 0;
                for (let i = data.items.length - 1; i >= 0; i--) {
                    if (data.items[i].topPx <= scrollCenter) {
                        currentItemIndex = i;
                        break;
                    }
                }

                const { yearIndex, centuryIndex } =
                    itemIndices[currentItemIndex];

                if (yearIndex !== previousYearIndex && yearContainer) {
                    previousYearIndex = yearIndex;
                    context.add(() => {
                        gsap.to(yearContainer, {
                            yPercent: -(yearIndex / yearParts.length) * 100,
                            duration: 0.3,
                            overwrite: true,
                        });
                    });
                }

                if (centuryIndex !== previousCenturyIndex && centuryContainer) {
                    previousCenturyIndex = centuryIndex;
                    context.add(() => {
                        gsap.to(centuryContainer, {
                            yPercent:
                                -(centuryIndex / centuryParts.length) * 100,
                            duration: 0.3,
                            overwrite: true,
                        });
                    });
                }
            };

            const step = LINE_HEIGHT + LINE_INTERVAL;
            let previousCenterIndex = -1;

            const updateActiveLines = () => {
                const centerY =
                    window.scrollY + window.innerHeight / 2 - containerTop;
                const centerIndex = Math.round(centerY / step);

                if (centerIndex === previousCenterIndex) return;

                const centerX = HOVER_LINE_WIDTH / 2;

                for (const offset of [-1, 0, 1]) {
                    const element = lineElements[previousCenterIndex + offset];
                    if (element)
                        context.add(() => {
                            gsap.to(element, {
                                attr: {
                                    x1: centerX - DEFAULT_LINE_WIDTH / 2,
                                    x2: centerX + DEFAULT_LINE_WIDTH / 2,
                                    opacity: 0.2,
                                },
                                duration: 0.3,
                                overwrite: true,
                            });
                        });
                }

                for (const offset of [-1, 0, 1]) {
                    const width =
                        offset === 0
                            ? ACTIVE_LINE_WIDTH
                            : SEMI_ACTIVE_LINE_WIDTH;
                    const element = lineElements[centerIndex + offset];
                    if (element)
                        context.add(() => {
                            gsap.to(element, {
                                attr: {
                                    x1: centerX - width / 2,
                                    x2: centerX + width / 2,
                                    opacity: offset === 0 ? 1 : 0.5,
                                },
                                duration: 0.3,
                                overwrite: true,
                            });
                        });
                }

                previousCenterIndex = centerIndex;
            };

            const tick = (delta: number) => {
                updateActiveLines();
                updateYearIndicator();

                if (isDragging) {
                    const { y } = getMousePosition().client;
                    dragOffsetY = y - window.innerHeight / 2;
                } else if (Math.abs(easedDragOffsetY) < ROUNDING_THRESHOLD) {
                    dragOffsetY = 0;
                    return;
                }

                easedDragOffsetY = dragPhysics.update(
                    delta / 1000,
                    dragOffsetY,
                );

                scrollTo(window.scrollY + easedDragOffsetY * SCROLL_FACTOR);
            };

            const onPointerUp = () => {
                isDragging = false;
                dragOffsetY = 0;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('pointerup', onPointerUp);
            };

            const onPointerEnter = () => {
                const target = lineElements[previousCenterIndex];
                if (target)
                    context.add(() => {
                        gsap.to(target, {
                            attr: { x1: 0, x2: HOVER_LINE_WIDTH },
                            duration: 0.2,
                            overwrite: true,
                        });
                    });
            };

            const onPointerLeave = () => {
                const target = lineElements[previousCenterIndex];
                if (target)
                    context.add(() => {
                        gsap.to(target, {
                            attr: {
                                x1:
                                    HOVER_LINE_WIDTH / 2 -
                                    ACTIVE_LINE_WIDTH / 2,
                                x2:
                                    HOVER_LINE_WIDTH / 2 +
                                    ACTIVE_LINE_WIDTH / 2,
                            },
                            duration: 0.2,
                            overwrite: true,
                        });
                    });
            };

            const onPointerDown = () => {
                isDragging = true;
                dragOffsetY = 0;
                document.body.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
                window.addEventListener('pointerup', onPointerUp);
            };

            gsap.ticker.add((_, delta) => tick(delta));
            dragIndicator?.addEventListener('pointerdown', onPointerDown);
            dragIndicator?.addEventListener('pointerenter', onPointerEnter);
            dragIndicator?.addEventListener('pointerleave', onPointerLeave);
            return () => {
                context.revert();

                // Reset all lines to their default state
                for (const element of lineElements) {
                    gsap.set(element, {
                        attr: {
                            x1: HOVER_LINE_WIDTH / 2 - DEFAULT_LINE_WIDTH / 2,
                            x2: HOVER_LINE_WIDTH / 2 + DEFAULT_LINE_WIDTH / 2,
                            opacity: 0.2,
                        },
                    });
                }

                dragIndicator?.removeEventListener(
                    'pointerdown',
                    onPointerDown,
                );
                dragIndicator?.removeEventListener(
                    'pointerenter',
                    onPointerEnter,
                );
                dragIndicator?.removeEventListener(
                    'pointerleave',
                    onPointerLeave,
                );
                gsap.ticker.remove(tick);
                window.removeEventListener('pointerup', onPointerUp);
            };
        },
        {
            // High debounce cuz of the rather heavy return callback
            debounceTime: 500,
            mediaQueryList: () => matchMedia('(min-width: 768px)'),
            loader: () => [import('gsap')] as const,
            load: {
                when: 'visible',
                ref: timelineRef,
            },
            observeWindowResize: () => true,
        },
        [data],
    );

    return (
        <div
            {...props}
            style={{ ...style, height: `${data.heightPx}px` }}
            className={cn('flex flex-col items-center', className)}
            ref={timelineRef}
        >
            <svg
                className="h-full absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none text-primary"
                style={{ width: `${HOVER_LINE_WIDTH}px` }}
                data-timeline-lines
            >
                <title>Timeline</title>
                {Array.from({
                    length: Math.ceil(
                        data.heightPx / (LINE_HEIGHT + LINE_INTERVAL),
                    ),
                }).map((_, index) => {
                    const y =
                        index * (LINE_HEIGHT + LINE_INTERVAL) + LINE_HEIGHT / 2;

                    return (
                        <line
                            key={String(index)}
                            x1={(HOVER_LINE_WIDTH - DEFAULT_LINE_WIDTH) / 2}
                            y1={y}
                            x2={(HOVER_LINE_WIDTH + DEFAULT_LINE_WIDTH) / 2}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth={LINE_HEIGHT}
                            opacity={0.2}
                        />
                    );
                })}
            </svg>
            <div
                style={{
                    rowGap: `${LINE_INTERVAL}px`,
                }}
                className="h-12 overflow-hidden sticky top-[calc(50vh-1.5rem)] cursor-grab flex gap-x-1 text-primary"
                id="timeline-draggable"
            >
                <div data-centuries className="h-fit">
                    {centuryParts.map((centuryPart, index) => (
                        <Heading
                            variant="heading-7"
                            as="p"
                            className="leading-[3rem]"
                            key={String(index)}
                        >
                            {centuryPart}
                        </Heading>
                    ))}
                </div>
                <div className="size-12" />
                <div data-years className="h-fit">
                    {yearParts.map((yearPart, index) => (
                        <Heading
                            variant="heading-7"
                            as="p"
                            className="leading-[3rem]"
                            key={String(index)}
                        >
                            {yearPart}
                        </Heading>
                    ))}
                </div>
            </div>
        </div>
    );
};
