'use client';

import { AnimatedHeading } from './animated-heading';
import type { MediaImage } from '@/payload-types';
import { type ComponentProps, type RefCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMotion } from '../hooks/use-motion';
import { createPhysicsBasedMotion } from '../utils/second-order-dynamics';
import { cn } from '../../shadcn/utils/ui';
import { useTranslations } from 'next-intl';
import { ImageCMS } from '@/components/content/content-image';
import { useSmoothScroll } from './smooth-scroll-context';
import type { Maybe } from '@/utils/maybe';
import { Slot } from '@radix-ui/react-slot';

const PROGRESS_PHYSICS = [1.2, 0.8, -0.2, 0] as const;
const WHEEL_PROGRESS_TARGET_PX = 5000;
const TOUCH_PROGRESS_TARGET_PX = 140;

const WHEEL_RESISTANCE_FACTOR = 0.005;
const WHEEL_RESISTANCE_EXPONENT = 1.25;

const COVER_TOP_TRANSFORM_PX = 144;

const NAVIGATION_DELAY_MS = 1000;

interface ScrollRedirectFooterProps extends ComponentProps<'div'> {
    eyebrow?: string;
    title: string;
    permalink: string;
    cover?: Maybe<MediaImage>;
    fadeEyebrow?: boolean;
}

export const ScrollRedirectFooter = ({
    eyebrow,
    title,
    cover,
    permalink,
    fadeEyebrow = true,
    ...props
}: ScrollRedirectFooterProps) => {
    const t = useTranslations('common');
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const { update } = createPhysicsBasedMotion(...PROGRESS_PHYSICS);
    const [isNavigating, setIsNavigating] = useState(false);
    const { setLocked } = useSmoothScroll();
    const gsapRef = useRef<GSAP | null>(null);
    const progressRef = useRef<HTMLDivElement[]>([]);
    const coverRef = useRef<HTMLDivElement>(null);

    const handleNavigate = () => {
        setIsNavigating(true);
        setLocked(true);

        const navigationTweenTarget = { value: 1 };
        const gsap = gsapRef.current;
        gsap?.to(navigationTweenTarget, {
            value: 0,
            duration: NAVIGATION_DELAY_MS / 1000,
            ease: 'power2.inOut',
            onUpdate: () => {
                progressRef.current.forEach((el) => {
                    if (!el) return;
                    gsap?.set(el, {
                        width: `${navigationTweenTarget.value * 100}%`,
                    });
                });
                if (!coverRef.current) return;
                gsap?.set(coverRef.current, {
                    top: `calc(100% + ${1 - navigationTweenTarget.value * COVER_TOP_TRANSFORM_PX}px)`,
                    clipPath: `inset(0 ${50 - navigationTweenTarget.value * 25}% 0 ${50 - navigationTweenTarget.value * 25}%)`,
                });
            },
        });

        const nextUrl = new URL(permalink);
        nextUrl.searchParams.set('tr', '1');

        setTimeout(() => {
            router.push(nextUrl.toString());
        }, NAVIGATION_DELAY_MS);
    };

    const activeEventTypeRef = useRef<'wheel' | 'touchmove' | null>(null);

    useMotion(
        ([{ default: gsap }]) => {
            gsapRef.current = gsap;
            if (permalink) {
                router.prefetch(permalink);
            }

            let lastTouchY: number | null = null;
            let progress = 0;
            let normalizedProgress = 0;
            let isNavigating = false;

            const handleTouch = (event: TouchEvent) => {
                if (isNavigating) return;
                activeEventTypeRef.current = 'touchmove';
                if (
                    document.documentElement.scrollTop + window.innerHeight <
                    document.documentElement.scrollHeight
                )
                    return;

                const { pageY } = event.touches[0];

                if (lastTouchY === null) {
                    lastTouchY = pageY;
                    return;
                }

                const deltaTouchY = pageY - lastTouchY;

                progress -= deltaTouchY;
                lastTouchY = pageY;
            };

            const handleWheel = (event: WheelEvent) => {
                activeEventTypeRef.current = 'wheel';
                if (
                    document.documentElement.scrollTop + window.innerHeight <
                    document.documentElement.scrollHeight
                )
                    return;
                progress += event.deltaY;
            };

            const handleTouchEnd = () => {
                lastTouchY = null;
                progress = 0;
            };

            const tick = (delta: number) => {
                if (isNavigating) return;
                if (normalizedProgress >= 1 && !isNavigating) {
                    isNavigating = true;
                    handleNavigate();
                    return;
                }

                switch (activeEventTypeRef.current) {
                    case 'wheel': {
                        const resistanceValue =
                            WHEEL_RESISTANCE_FACTOR *
                            progress *
                            (progress / WHEEL_PROGRESS_TARGET_PX) **
                                WHEEL_RESISTANCE_EXPONENT;

                        progress = Math.max(progress - resistanceValue, 0);

                        const easedProgress = Math.min(
                            update(delta / 1000, progress),
                            WHEEL_PROGRESS_TARGET_PX,
                        );

                        normalizedProgress =
                            easedProgress / WHEEL_PROGRESS_TARGET_PX;

                        progressRef.current.forEach((el) => {
                            if (!el) return;
                            gsap.set(el, {
                                width: `${normalizedProgress * 100}%`,
                            });
                        });
                        if (!coverRef.current) return;
                        gsap.set(coverRef.current, {
                            top: `calc(100% + ${1 - normalizedProgress * COVER_TOP_TRANSFORM_PX}px)`,
                            clipPath: `inset(0 ${50 - normalizedProgress * 25}% 0 ${50 - normalizedProgress * 25}%)`,
                        });

                        break;
                    }
                    case 'touchmove': {
                        const easedProgress = Math.min(
                            update(delta / 1000, progress),
                            TOUCH_PROGRESS_TARGET_PX,
                        );
                        normalizedProgress =
                            easedProgress / TOUCH_PROGRESS_TARGET_PX;

                        progressRef.current.forEach((el) => {
                            if (!el) return;
                            gsap.set(el, {
                                width: `${normalizedProgress * 100}%`,
                            });
                        });
                        if (!coverRef.current) return;
                        gsap.set(coverRef.current, {
                            top: `calc(100% + ${1 - normalizedProgress * COVER_TOP_TRANSFORM_PX}px)`,
                            clipPath: `inset(0 ${50 - normalizedProgress * 25}% 0 ${50 - normalizedProgress * 25}%)`,
                        });

                        break;
                    }
                }
            };

            const tickerCallback = (_: number, delta: number) => tick(delta);
            gsap.ticker.add(tickerCallback);

            window.addEventListener('wheel', handleWheel, { passive: true });
            window.addEventListener('touchmove', handleTouch, {
                passive: true,
            });
            window.addEventListener('touchend', handleTouchEnd, {
                passive: true,
            });

            return () => {
                gsap.ticker.remove(tickerCallback);
                window.removeEventListener('wheel', handleWheel);
                window.removeEventListener('touchmove', handleTouch);
                window.removeEventListener('touchend', handleTouchEnd);
            };
        },
        {
            load: { when: 'visible', ref: containerRef },
            loader: () => [import('gsap')] as const,
        },
    );

    progressRef.current = [];

    return (
        <div
            {...props}
            className={cn(
                'h-svh relative flex flex-col items-center justify-center overflow-hidden',
                isNavigating && 'cursor-wait',
            )}
            ref={containerRef}
        >
            <div className="flex flex-col items-center gap-y-16 justify-center w-full">
                <div className="md:hidden h-px" />
                <AnimatedHeading
                    variant="base"
                    as="p"
                    state={isNavigating ? 'out' : 'in'}
                    config={{
                        fadeIn: fadeEyebrow ? undefined : { enabled: false },
                    }}
                >
                    {eyebrow}
                </AnimatedHeading>
                <h3 className="sr-only">{`${eyebrow}: ${title}`}</h3>
                <div className="flex w-full items-center justify-center md:justify-between gap-x-10">
                    <div className="grow-[2] justify-end hidden md:flex">
                        <ProgressLine
                            isNavigating={isNavigating}
                            className="justify-end"
                            progressRef={(el) => {
                                if (el) {
                                    progressRef.current.push(el);
                                }
                            }}
                        />
                    </div>
                    <AnimatedHeading
                        variant="heading-1"
                        className="uppercase text-center max-w-4xl grow"
                        as="p"
                        config={{
                            autoSplit: false,
                        }}
                    >
                        {title}
                    </AnimatedHeading>
                    <div className="grow-[2] justify-start hidden md:flex">
                        <ProgressLine
                            isNavigating={isNavigating}
                            className="justify-start"
                            progressRef={(el) => {
                                if (el) {
                                    progressRef.current.push(el);
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="flex md:hidden justify-center w-full px-10">
                    <ProgressLine
                        isNavigating={isNavigating}
                        className="justify-end"
                        progressRef={(el) => {
                            if (el) {
                                progressRef.current.push(el);
                            }
                        }}
                    />
                    <ProgressLine
                        isNavigating={isNavigating}
                        className="justify-start"
                        progressRef={(el) => {
                            if (el) {
                                progressRef.current.push(el);
                            }
                        }}
                    />
                </div>
                <AnimatedHeading
                    variant="base"
                    as="p"
                    state={isNavigating ? 'out' : 'in'}
                    className="!leading-none"
                >
                    {t('keepScrolling')}
                </AnimatedHeading>
            </div>
            <div className="flex flex-col gap-y-20 sm:gap-y-40 items-center">
                <Slot className="absolute" ref={coverRef}>
                    <ImageCMS
                        className="clip-path-[inset(0%_50%_50%_50%)] top-full"
                        image={cover}
                    />
                </Slot>
            </div>
        </div>
    );
};

const ProgressLine = ({
    progressRef,
    className,
    isNavigating,
}: {
    progressRef: RefCallback<HTMLDivElement>;
    className?: string;
    isNavigating?: boolean;
}) => {
    return (
        <div
            className={cn(
                'h-px bg-secondary flex transition-all ease-out w-full',
                isNavigating && 'w-0',
                className,
            )}
            style={{
                transitionDuration: `${NAVIGATION_DELAY_MS}ms`,
            }}
        >
            <div ref={progressRef} className="w-0 h-full bg-invert" />
        </div>
    );
};
