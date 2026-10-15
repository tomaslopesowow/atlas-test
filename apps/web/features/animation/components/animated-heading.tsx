'use client';

import { useEffect, useRef, useState } from 'react';
import { Heading, type HeadingProps } from '@/components/common/heading';
import type { LoadImportsEvent } from '../hooks/use-import';
import { useMotion } from '../hooks/use-motion';
import type {
    AnimatedHeadingConfig,
    AnimatedHeadingFadeInConfig,
    AnimatedHeadingFillOnScrollConfig,
} from '@/types/shared';

const SCROLL_LINES_STYLES: React.CSSProperties = {
    background:
        'linear-gradient(90deg, rgb(from currentColor r g b / 0.25) 0%, rgb(from currentColor r g b / 0.25) 50%, rgb(from currentColor r g b / 1) 50%, rgb(from currentColor r g b / 1) 100%)',
    backgroundPosition: '100% 0',
    backgroundSize: '200% 100%',
    backgroundClip: 'text',
    backgroundPositionX: '200%',
    WebkitTextFillColor: 'transparent',
};

type AnimatedHeadingProps = HeadingProps & {
    config?: AnimatedHeadingConfig;
    state?: 'in' | 'out';
    splitLines?: boolean;
    onFinished?: () => void;
    when?: LoadImportsEvent;
};

// Default Configurations
const DEFAULT_FADE_IN: Required<AnimatedHeadingFadeInConfig> = {
    enabled: true,
    scrub: false,
    durationSeconds: 1.8,
    staggerSeconds: 0.4,
    ease: 'power2.out',
    blurPixels: 8,
    rotateDeg: 1,
    translateYPixels: 4,
    startOffsetPixels: 100,
    endOffsetPixels: 500,
    delaySeconds: 0,
};

const DEFAULT_FILL_ON_SCROLL: Required<AnimatedHeadingFillOnScrollConfig> = {
    enabled: false,
    durationSeconds: 2,
    staggerSeconds: 2,
    ease: 'linear',
    scrub: 3,
    startOffsetPixels: 100,
    endOffsetPixels: 500,
    delaySeconds: 0,
};

const DEFAULT_AUTO_SPLIT: boolean = true;

export function AnimatedHeading({
    children,
    config,
    state,
    splitLines = true,
    onFinished,
    style,
    when = 'visible',
    ...props
}: AnimatedHeadingProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const [controlledState, setControlledState] = useState<'in' | 'out'>('in');
    const animationStateRef = useRef<'in' | 'out'>('in');
    const splitTextRef = useRef<SplitText | null>(null);
    const gsapRef = useRef<GSAP>(null);

    const configRef = useRef({
        fadeIn: { ...DEFAULT_FADE_IN, ...config?.fadeIn },
        fillOnScroll: { ...DEFAULT_FILL_ON_SCROLL, ...config?.fillOnScroll },
        autoSplit: config?.autoSplit ?? DEFAULT_AUTO_SPLIT,
    });

    const { fadeIn, fillOnScroll, autoSplit } = configRef.current;

    const fillOnScrollLinesStyles = {
        filter: `blur(${fadeIn.blurPixels}px)`,
        opacity: 0,
        transform: `translateY(${fadeIn.translateYPixels}px) rotate(${fadeIn.rotateDeg}deg)`,
    };

    useEffect(() => {
        if (state) {
            setControlledState(state);
            animationStateRef.current = state;
        }
    }, [state]);

    const animateIn = (targets: SplitText['lines'] | HTMLHeadingElement) => {
        const gsap = gsapRef.current;
        if (!gsap) return;

        for (const target of [targets].flat()) {
            if (!target) continue;
            Object.assign((target as HTMLElement).style, {
                ...(fadeIn.enabled && fillOnScrollLinesStyles),
                ...(fillOnScroll.enabled && SCROLL_LINES_STYLES),
            });
        }

        if (Array.isArray(targets)) {
            gsap.set(headingRef.current, {
                opacity: 1,
            });
        }

        if (fadeIn.enabled) {
            gsap.to(targets, {
                duration: fadeIn.durationSeconds,
                stagger: fadeIn.staggerSeconds,
                ease: fadeIn.ease,
                opacity: 1,
                y: 0,
                rotate: 0,
                transformOrigin: 'left center',
                filter: 'blur(0px)',
                overwrite: true,
                delay: fadeIn.delaySeconds,
                scrollTrigger: {
                    start: `${fadeIn.startOffsetPixels} bottom`,
                    end: `bottom+=${fadeIn.endOffsetPixels} bottom`,
                    trigger: headingRef.current,
                    scrub: fadeIn.scrub,
                },
            }).then(() => {
                onFinished?.();
            });
        }

        if (fillOnScroll.enabled) {
            gsap.to(targets, {
                duration: fillOnScroll.durationSeconds,
                backgroundPositionX: '100%',
                stagger: fillOnScroll.staggerSeconds,
                ease: fillOnScroll.ease,
                delay: fillOnScroll.delaySeconds,
                scrollTrigger: {
                    start: `${fillOnScroll.startOffsetPixels} bottom`,
                    end: `bottom+=${fillOnScroll.endOffsetPixels} bottom`,
                    scrub: fillOnScroll.scrub,
                    trigger: headingRef.current,
                },
            });
        }
    };

    const animateOut = (targets: SplitText['lines'] | HTMLHeadingElement) => {
        const gsap = gsapRef.current;
        if (!gsap) return;

        gsap.to(targets, {
            duration: fadeIn.durationSeconds / 4,
            stagger: fadeIn.staggerSeconds / 4,
            ease: fadeIn.ease,
            opacity: 0,
            y: -fadeIn.translateYPixels,
            rotate: -fadeIn.rotateDeg,
            filter: `blur(${fadeIn.blurPixels}px)`,
            overwrite: true,
        }).then(() => {
            if (animationStateRef.current !== 'out') return;
            gsap.set(headingRef.current, {
                opacity: 0,
            });
            splitTextRef.current?.revert();
            splitTextRef.current = null;
        });
    };

    useMotion(
        ([{ default: gsap }, { default: SplitText }]) => {
            gsap.registerPlugin(SplitText);
            gsapRef.current = gsap;

            switch (true) {
                case controlledState === 'in' && splitLines: {
                    splitTextRef.current = SplitText.create(
                        headingRef.current,
                        {
                            type: 'lines',
                            onSplit: ({ lines }) => animateIn(lines),
                            autoSplit,
                        },
                    );
                    break;
                }
                case controlledState === 'in' && !splitLines: {
                    if (!headingRef.current) return;
                    animateIn(headingRef.current);
                    break;
                }
                case fadeIn.enabled &&
                    controlledState === 'out' &&
                    !!splitTextRef.current: {
                    animateOut(splitTextRef.current.lines);
                    break;
                }
                case fadeIn.enabled &&
                    controlledState === 'out' &&
                    !splitTextRef.current: {
                    if (!headingRef.current) return;
                    animateOut(headingRef.current);
                    break;
                }
            }

            return () => {
                if (
                    fadeIn.enabled &&
                    controlledState === 'out' &&
                    splitTextRef.current
                ) {
                    splitTextRef.current.revert();
                    splitTextRef.current = null;
                }
            };
        },
        {
            loader: () => [import('gsap'), import('gsap/SplitText')] as const,
            load: {
                when,
                ref: headingRef,
                options: {
                    rootMargin: '400px 0px 400px 0px',
                },
            },
        },
        [controlledState],
    );

    return (
        <Heading
            style={{
                // Custom font kerning causes GSAP (SplitText) to incorrectly calculate the width of the texts
                // Which sometimes causes excessive whitespace
                // See https://gsap.com/docs/v3/Plugins/SplitText/#tips--limitations
                fontKerning: 'none',
                opacity: fadeIn?.enabled ? 0 : 1,
                lineHeight: 1.3,
                ...style,
            }}
            ref={headingRef}
            {...props}
        >
            {children}
        </Heading>
    );
}
