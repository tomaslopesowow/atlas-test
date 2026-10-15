'use client';
import { cn } from '@repo/lib/utils/cn';
import { type ComponentProps, useRef } from 'react';
import { useMotion } from '@/features/animation/hooks/use-motion';
import { getMousePosition } from '@/features/animation/utils/pointer';
import { createPhysicsBasedMotion } from '@/features/animation/utils/second-order-dynamics';

type MarqueeProps = ComponentProps<'div'> & {
    speed?: number;
    direction?: 'ltr' | 'rtl' | 'scroll' | 'scroll-reverse';
    scrollVelocity?: number;
    scrollPhysics?: Parameters<typeof createPhysicsBasedMotion>;
    debounceTime?: number;
    pauseOnMouseEnter?: boolean;
    pauseThreshold?: number;
    draggable?: boolean;
    dragThreshold?: number;
    dragPhysics?: Parameters<typeof createPhysicsBasedMotion>;
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
 * @param {number} props.scrollVelocity - The acceleration factor for scrolling motion.
 * @param {Parameters<typeof createPhysicsBasedMotion>} props.scrollPhysics - The physics-based motion configuration, consisting of speed, damping, response and x0.
 * @param {number} props.debounceTime - The debounce time, used when recalculating values after resizing.
 * @param {boolean} props.pauseOnMouseEnter - Whether to pause the animation when the mouse enters the component.
 * @param {number} props.pauseThreshold - Change how quickly the animation eases into the pause. e.g. 0 is instant, 100 is slowly. Should be a positive number.
 * @param {boolean} props.draggable - Whether to enable dragging of the marquee.
 * @param {number} props.dragThreshold - Change how fast the marquee moves when dragging.
 * @param {Parameters<typeof createPhysicsBasedMotion>} props.dragPhysics - The physics-based motion configuration, consisting of speed, damping, response and x0.
 *
 * @example
 * <Marquee>
 *    <h1>Hello world</h1>
 * </Marquee>
 */

export const Marquee = ({ children, className, ...config }: MarqueeProps) => {
    const configRef = useRef({
        speed: config.speed ?? 1,
        direction: config.direction ?? 'ltr',
        scrollVelocity: config.scrollVelocity ?? 1,
        scrollPhysics: config.scrollPhysics ?? [1, 2, 0, 0],
        debounceTime: config.debounceTime ?? 20,
        pauseOnMouseEnter: config.pauseOnMouseEnter ?? false,
        pauseThreshold: config.pauseThreshold ?? 30,
        draggable: config.draggable ?? false,
        dragThreshold: config.dragThreshold ?? 15,
        dragPhysics: config.dragPhysics ?? [0.02, 0.8, -0.2, 0],
    });

    const {
        speed,
        direction,
        scrollVelocity,
        scrollPhysics,
        debounceTime,
        pauseOnMouseEnter,
        pauseThreshold,
        draggable,
        dragThreshold,
        dragPhysics,
    } = configRef.current;

    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<HTMLDivElement>(null);
    const hasScrollMotion = scrollVelocity > 0;

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
            const cloneRepetitions =
                Math.ceil(outerWidth / innerWidth) * (hasScrollMotion ? 2 : 1);

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

            const ctx = gsap.context(() => {
                const target = gsap.utils.toArray([
                    clonedElements,
                    innerRef.current,
                ]);

                let progress = 0;
                const setX = gsap.quickSetter(target, 'x', 'px');
                const scrollPBM = createPhysicsBasedMotion(...scrollPhysics);
                const dragPBM = createPhysicsBasedMotion(...dragPhysics);
                let directionValue = 1;
                let _ScrollTrigger: ScrollTrigger;
                let scroll = 0;
                let pauseFactor = 0;
                let dragX = 0;
                let prevDragX = 0;

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

                gsap.ticker.add(() => {
                    const deltaRatio = gsap.ticker.deltaRatio();
                    switch (direction) {
                        case 'ltr':
                            directionValue = -1;
                            scroll = -Math.abs(
                                scrollPBM.update(
                                    deltaRatio,
                                    _ScrollTrigger.getVelocity() /
                                        (100 / scrollVelocity),
                                ),
                            );
                            break;
                        case 'rtl':
                            directionValue = 1;
                            scroll = Math.abs(
                                scrollPBM.update(
                                    deltaRatio,
                                    _ScrollTrigger.getVelocity() /
                                        (100 / scrollVelocity),
                                ),
                            );
                            break;
                        case 'scroll':
                            if (!hasScrollMotion) break;
                            directionValue = -(_ScrollTrigger.direction ?? 1);
                            scroll = -scrollPBM.update(
                                deltaRatio,
                                _ScrollTrigger.getVelocity() /
                                    (100 / scrollVelocity),
                            );
                            break;
                        case 'scroll-reverse':
                            if (!hasScrollMotion) break;
                            directionValue = _ScrollTrigger.direction ?? 1;
                            scroll = scrollPBM.update(
                                deltaRatio,
                                _ScrollTrigger.getVelocity() /
                                    (100 / scrollVelocity),
                            );
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
                                pauseFactor +
                                    deltaRatio / Math.abs(pauseThreshold),
                                1,
                            );
                        } else {
                            pauseFactor = Math.max(
                                pauseFactor -
                                    deltaRatio / Math.abs(pauseThreshold),
                                0,
                            );
                        }
                    }

                    const contentBasedSpeed =
                        innerWidth > 0 ? Math.max(0.1, 1000 / innerWidth) : 0.1;
                    const effectiveSpeed = speed * contentBasedSpeed;

                    progress =
                        ((progress +
                            (deltaRatio * effectiveSpeed * directionValue +
                                scroll) *
                                (1 - pauseFactor)) %
                            100) -
                        dragPBM.update(deltaRatio, dragX) / dragThreshold;

                    setX(-(innerWidth * progress) / 100);
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
            load: { when: 'visible', ref: outerRef },
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
                className="inline-flex w-auto shrink-0 will-change-transform"
            >
                {children}
            </div>
        </div>
    );
};
