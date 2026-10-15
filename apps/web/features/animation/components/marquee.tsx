'use client';
import { type ComponentProps, useRef } from 'react';
import { useMotion } from '@/features/animation/hooks/use-motion';
import { getMousePosition } from '@/features/animation/utils/pointer';
import { createPhysicsBasedMotion } from '@/features/animation/utils/second-order-dynamics';
import { cn } from '@/features/shadcn/utils/ui';

type MarqueeProps = ComponentProps<'div'> & {
    speed?: number;
    direction?: 'ltr' | 'rtl' | 'scroll' | 'scroll-reverse';
    scrollVelocity?: number;
    physics?: Parameters<typeof createPhysicsBasedMotion>;
    debounceTime?: number;
    pauseOnMouseEnter?: boolean;
    pauseThreshold?: number;
    draggable?: boolean;
    dragResistance?: number;
    // TODO: add snap start / end
    snap?: 'center' | false;
    onSettle?: (activeIndex: number) => void;
};

/**
 * Marquee component that creates a infinite scrolling effect for its children.
 *
 * @description
 * The Marquee component is a utility component that creates a infinite scrolling effect for its children.
 *
 * @param {string} props.className - Additional classnames for the outer div.
 * @param {number} props.speed - The speed of the scrolling motion.
 * @param {'ltr' | 'rtl' | 'scroll' | 'scroll-reverse'} props.direction - The direction of the scrolling motion.
 * @param {number} props.
 * Velocity - The acceleration factor for scrolling motion.
 * @param {Parameters<typeof createPhysicsBasedMotion>} props.scrollPhysics - The physics-based motion configuration, consisting of speed, damping, response and x0.
 * @param {number} props.debounceTime - The debounce time, used when recalculating values after resizing.
 * @param {boolean} props.pauseOnMouseEnter - Whether to pause the animation when the mouse enters the component.
 * @param {number} props.pauseThreshold - Change how quickly the animation eases into the pause. e.g. 0 is instant, 100 is slowly. Should be a positive number.
 * @param {boolean} props.draggable - Whether to enable dragging of the marquee.
 * @param {number} props.dragResistance - Change how fast the marquee moves when dragging.
 * @param {Parameters<typeof createPhysicsBasedMotion>} props.dragPhysics - The physics-based motion configuration, consisting of speed, damping, response and x0.
 * @param {'center' | 'start' | false} props.snap - Whether to snap the marquee to the center or start of the container.
 *
 * @example
 * <Marquee>
 *    <h1>Hello world</h1>
 * </Marquee>
 */

const SNAP_THRESHOLD = 0.1;
const SETTLE_THRESHOLD = 0.001;
const SETTLE_DELAY_MS = 500;
const ROOT_MARGIN = '400px';

const DEFAULT_VALUES = {
    speed: 0.1,
    direction: 'rtl',
    scrollVelocity: 0.03,
    physics: [0.8, 0.8, -0.2, 0],
    debounceTime: 20,
    pauseOnMouseEnter: false,
    pauseThreshold: 30,
    draggable: false,
    dragResistance: 40,
    snap: false,
};

const getSnapTarget = (
    currentProgress: number,
    childSnapPoints: number[],
    innerWidth: number,
    outerWidth: number,
    innerOffset: number,
): {
    progress: number;
    index: number;
} => {
    const containerCenter = outerWidth / 2 - innerOffset;

    const baseSnapProgressValues = childSnapPoints.map(
        (snapPoint) => ((snapPoint - containerCenter) * 100) / innerWidth,
    );

    let closestSnapProgress = baseSnapProgressValues[0];
    let closestDistance = Infinity;
    let closestIndex = 0;

    for (const [index, baseSnap] of baseSnapProgressValues.entries()) {
        const nearestCycle = Math.round((currentProgress - baseSnap) / 100);
        const adjustedSnap = baseSnap + nearestCycle * 100;
        const distance = Math.abs(currentProgress - adjustedSnap);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestSnapProgress = adjustedSnap;
            closestIndex = index;
        }
    }

    return {
        progress: closestSnapProgress,
        index: closestIndex,
    };
};

export const Marquee = ({
    children,
    className,
    onSettle,
    ...config
}: MarqueeProps) => {
    const mergedConfig = {
        ...DEFAULT_VALUES,
        ...config,
        speed: config.snap ? 0 : (config.speed ?? DEFAULT_VALUES.speed),
    };

    const {
        speed,
        direction,
        scrollVelocity,
        physics,
        debounceTime,
        pauseOnMouseEnter,
        pauseThreshold,
        draggable,
        dragResistance,
        snap,
    } = mergedConfig;

    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<HTMLDivElement>(null);
    const hasScrollMotion = scrollVelocity > 0;

    const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useMotion(
        (modules) => {
            if (!innerRef.current || !outerRef.current) return;

            const gsap = modules[0].default;

            const ScrollTrigger = modules
                .slice(1)
                .find((module) =>
                    Object.keys(module).includes('ScrollTrigger'),
                )?.default;

            const Draggable = modules
                .slice(1)
                .find((module) =>
                    Object.keys(module).includes('Draggable'),
                )?.default;

            const outerWidth = outerRef.current.clientWidth;
            const innerWidth = innerRef.current.scrollWidth;
            const innerOffset = innerRef.current.offsetLeft;
            const cloneRepetitions =
                innerWidth === 0
                    ? 0
                    : Math.ceil(outerWidth / innerWidth) *
                      (hasScrollMotion ? 2 : 1);

            const clonedElements = Array.from(
                { length: cloneRepetitions },
                () => {
                    // @ts-expect-error innerRef.current can literally not be null
                    return innerRef.current.cloneNode(true);
                },
            );

            for (const element of clonedElements) {
                outerRef.current.appendChild(element);
            }

            // Calculate snap points (center of each child element)
            const childSnapPoints: number[] = [];
            const originalChildren = Array.from(innerRef.current.children);
            for (const child of originalChildren) {
                const element = child as HTMLElement;
                childSnapPoints.push(
                    element.offsetLeft + element.offsetWidth / 2,
                );
            }

            const ctx = gsap.context(() => {
                const target = gsap.utils.toArray([
                    clonedElements,
                    innerRef.current,
                ]);

                let progress = 0;
                const setX = gsap.quickSetter(target, 'x', 'px');
                const physicsBasedMotion = createPhysicsBasedMotion(...physics);
                let directionValue = 1;
                let _ScrollTrigger: ScrollTrigger;
                let scrollVelocity = 0;
                let pauseFactor = 0;
                let dragX = 0;
                let prevDragX = 0;
                let previousProgress = 0;
                let previousEasedProgress = 0;
                let shouldSnap = !!snap;
                let snappedIndex = 0;
                let settled = false;

                if (hasScrollMotion && ScrollTrigger) {
                    gsap.registerPlugin(ScrollTrigger);
                    //@ts-expect-error This can't be typeof gsap because it was sliced out of the modules array
                    _ScrollTrigger = ScrollTrigger.create({});
                }

                if (draggable && Draggable) {
                    gsap.registerPlugin(Draggable);
                    //@ts-expect-error This can't be typeof gsap because it was sliced out of the modules array
                    Draggable.create(shadowRef.current, {
                        trigger: outerRef.current,
                        type: 'x',
                        onDrag: ({
                            type,
                            touches,
                            movementX,
                        }: {
                            type: string;
                            touches: { pageX: number }[];
                            movementX: number;
                        }) => {
                            if (type === 'pointermove') {
                                dragX = movementX;
                            }
                            if (type === 'touchmove') {
                                if (prevDragX === 0) {
                                    prevDragX = touches[0].pageX;
                                }
                                dragX = touches[0].pageX - prevDragX;
                                prevDragX = touches[0].pageX;
                            }
                        },
                        onDragEnd: () => {
                            prevDragX = 0;
                            dragX = 0;
                            if (snap === 'center' && draggable && !shouldSnap) {
                                shouldSnap = true;
                            }
                        },
                    });
                }

                const { top, bottom, left, right } =
                    outerRef.current?.getBoundingClientRect() ?? {};

                const targetRect = {
                    top: (top ?? 0) + window.scrollY,
                    bottom: (bottom ?? 0) + window.scrollY,
                    left: (left ?? 0) + window.scrollX,
                    right: (right ?? 0) + window.scrollX,
                };

                gsap.ticker.add((_, delta) => {
                    switch (direction) {
                        case 'ltr':
                            directionValue = -1;
                            scrollVelocity = -Math.abs(
                                _ScrollTrigger.getVelocity() /
                                    (100 / scrollVelocity),
                            );
                            break;
                        case 'rtl':
                            directionValue = 1;
                            scrollVelocity = Math.abs(
                                _ScrollTrigger.getVelocity() /
                                    (100 / scrollVelocity),
                            );
                            break;
                        case 'scroll':
                            if (!hasScrollMotion) break;
                            directionValue = -(_ScrollTrigger.direction ?? 1);
                            scrollVelocity =
                                -_ScrollTrigger.getVelocity() /
                                (100 / scrollVelocity);
                            break;
                        case 'scroll-reverse':
                            if (!hasScrollMotion) break;
                            directionValue = _ScrollTrigger.direction ?? 1;
                            scrollVelocity =
                                _ScrollTrigger.getVelocity() /
                                (100 / scrollVelocity);
                            break;
                    }

                    if (pauseOnMouseEnter) {
                        const { x, y } = getMousePosition().page;
                        if (
                            x > targetRect.left &&
                            x < targetRect.right &&
                            y > targetRect.top &&
                            y < targetRect.bottom
                        ) {
                            pauseFactor = Math.min(
                                pauseFactor + Math.abs(pauseThreshold),
                                1,
                            );
                        } else {
                            pauseFactor = Math.max(
                                pauseFactor - Math.abs(pauseThreshold),
                                0,
                            );
                        }
                    }

                    const contentBasedSpeedFactor =
                        innerWidth > 0 ? Math.max(0.1, 1000 / innerWidth) : 0.1;
                    const contentBasedSpeed = speed * contentBasedSpeedFactor;

                    const currentProgress =
                        progress +
                        (contentBasedSpeed * directionValue + scrollVelocity) *
                            (1 - pauseFactor) -
                        dragX / dragResistance;

                    progress = currentProgress;

                    const deltaProgress = Math.abs(progress - previousProgress);

                    if (shouldSnap && deltaProgress < SNAP_THRESHOLD) {
                        const snap = getSnapTarget(
                            progress,
                            childSnapPoints,
                            innerWidth,
                            outerWidth,
                            innerOffset,
                        );
                        snappedIndex = snap.index;
                        progress = snap.progress;
                        shouldSnap = false;
                    }

                    const easedProgress =
                        physicsBasedMotion.update(delta / 1000, progress) % 100;

                    setX(-(innerWidth * easedProgress) / 100);

                    const deltaEasedProgress = Math.abs(
                        easedProgress - previousEasedProgress,
                    );

                    if (deltaEasedProgress < SETTLE_THRESHOLD && !settled) {
                        settled = true;
                        settleTimeoutRef.current = setTimeout(() => {
                            onSettle?.(snappedIndex);
                        }, SETTLE_DELAY_MS);
                    }

                    if (deltaEasedProgress > SETTLE_THRESHOLD && settled) {
                        settleTimeoutRef.current &&
                            clearTimeout(settleTimeoutRef.current);
                        settleTimeoutRef.current = null;
                        settled = false;
                    }

                    previousProgress = progress;
                    previousEasedProgress = easedProgress;
                });
            });

            return () => {
                for (const element of clonedElements) {
                    outerRef.current?.removeChild(element);
                }
                ctx.revert();
            };
        },
        {
            debounceTime,
            observeElementResize: () => outerRef.current,
            load: {
                when: 'visible',
                ref: outerRef,
                options: { rootMargin: ROOT_MARGIN },
            },
            loader: () => {
                const conditionalModules = [];
                if (hasScrollMotion)
                    conditionalModules.push(import('gsap/ScrollTrigger'));
                if (draggable)
                    conditionalModules.push(import('gsap/Draggable'));
                return [import('gsap'), ...conditionalModules] as const;
            },
        },
    );

    return (
        <div
            ref={outerRef}
            className={cn(
                'w-full overflow-x-hidden whitespace-nowrap flex',
                {
                    'justify-start': direction === 'rtl',
                    'justify-end': direction === 'ltr',
                    'justify-center': hasScrollMotion,
                },
                className,
            )}
        >
            <div ref={shadowRef} className="!-z-50" />
            <div
                ref={innerRef}
                className="inline-flex w-fit shrink-0 will-change-transform"
            >
                {children}
            </div>
        </div>
    );
};
