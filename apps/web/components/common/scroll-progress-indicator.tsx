'use client';

import { type ComponentProps, type ReactNode, useRef } from 'react';
import CircleProgress from '../icons/circleProgress';
import CompassNeedle from '../icons/compass-needle';
import { useMotion } from '@/features/animation/hooks/use-motion';
import { cn } from '@/features/shadcn/utils/ui';
import type { Maybe } from '@/utils/maybe';

const CIRCLE_RADIUS = 22;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const FULL_ROTATION_DISTANCE_PX = 1500;
const SCRUB = 2;

const DEFAULT_CONTENT = <CompassNeedle className="w-[1.375rem] text-primary" />;

type ScrollProgressIndicatorProps = Omit<ComponentProps<'div'>, 'content'> & {
    content?: Maybe<ReactNode>;
    rotateContent?: boolean;
};

export const ScrollProgressIndicator = ({
    content,
    rotateContent = true,
    ...props
}: ScrollProgressIndicatorProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const iconCircleRef = useRef<SVGCircleElement>(null);
    const circleRef = useRef<SVGSVGElement | null>(null);

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            const context = gsap.context(() => {
                if (!contentRef.current) return;
                gsap.registerPlugin(ScrollTrigger);

                gsap.set(iconCircleRef.current, {
                    strokeDasharray: CIRCLE_CIRCUMFERENCE.toFixed(),
                    strokeDashoffset: CIRCLE_CIRCUMFERENCE.toFixed(),
                    opacity: 0,
                });

                const triggerElement =
                    document.querySelector('main') || document.body;

                gsap.to(iconCircleRef.current, {
                    strokeDashoffset: 0,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: triggerElement,
                        start: 'top top',
                        end: 'bottom bottom',
                        scrub: SCRUB,
                        invalidateOnRefresh: true,
                        onLeaveBack: () => {
                            gsap.set(iconCircleRef.current, {
                                opacity: 0,
                            });
                        },
                        onEnter: () => {
                            gsap.set(iconCircleRef.current, {
                                opacity: 1,
                            });
                        },
                        onUpdate: (self) => {
                            circleRef.current?.setAttribute(
                                'data-progress',
                                self.progress.toString(),
                            );
                        },
                    },
                });

                if (!rotateContent) return;

                gsap.set(contentRef.current, {
                    rotation: 45,
                });

                const maxScroll =
                    triggerElement.scrollHeight - window.innerHeight;
                const maxRotation =
                    45 + (maxScroll / FULL_ROTATION_DISTANCE_PX) * 360;

                gsap.to(contentRef.current, {
                    rotation: maxRotation,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: triggerElement,
                        start: 'top top',
                        end: 'bottom bottom',
                        scrub: SCRUB,
                    },
                });
            });

            return () => {
                context.kill(true);
            };
        },
        {
            load: {
                when: 'load',
            },
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
        },
    );

    return (
        <div
            {...props}
            className={cn(
                'items-center gap-4 hidden lg:flex group',
                props.className,
            )}
        >
            <div className="w-12 h-12 flex items-center justify-center relative">
                <div className="absolute border-[1px] border-primary rounded-full w-full h-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <CircleProgress
                        circleRef={circleRef}
                        className="w-full h-full"
                        circleClassname="transition-opacity duration-300 text-border-primary"
                        aria-hidden="true"
                    />
                </div>
                <div
                    ref={contentRef}
                    className="flex items-center justify-center"
                >
                    {content ?? DEFAULT_CONTENT}
                </div>
            </div>
        </div>
    );
};
