'use client';

import { Slot } from '@radix-ui/react-slot';
import type { HeadingProps } from '@repo/ui/components/heading';
import { useRef } from 'react';
import { useMotion } from '../hooks/use-motion';

type TextClipRevealProps = Omit<HeadingProps, 'asChild'> & {
    debounceTime?: number;
    scrub?: boolean | number;
    stagger?: number;
    triggerPosition?: string | number | ScrollTrigger.StartEndFunc;
    reversable?: boolean;
    ease?: gsap.EaseString | gsap.EaseFunction;
    type?: 'lines' | 'words' | 'chars';
};

/**
 * TextClipReveal component that animates the reveal of its children.
 *
 * @description
 * The TextClipReveal component is a component that animates the reveal of its children.
 *
 * @param {string} props.className - Additional classnames for the outer div.
 * @param {number} props.debounceTime - The debounce time, used when recalculating values after resizing.
 * @param {boolean | number} props.scrub - The scrubbing behavior for the animation.
 * @param {number} props.stagger - The stagger time for the animation.
 * @param {string | number | ScrollTrigger.StartEndFunc} props.triggerPosition - The vertical position of the scrollTrigger.
 * @param {boolean} props.reversable - Whether the animation is reversible after finishing the scrub.
 * @param {gsap.EaseString | gsap.EaseFunction} props.ease - The easing function for the animation.
 * @param {'lines' | 'words' | 'chars'} props.type - Animate either lines, words or characters. Beware that this can have impact on performance.
 *
 * @example
 * <TextClipReveal>
 *    <Heading>
 *        Lorem ipsum dolor sit amet consectetur adipisicing elit.
 *    </Heading>
 * </TextClipReveal>
 */

export const TextClipReveal = ({
    children,
    className,
    ...config
}: TextClipRevealProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const configRef = useRef({
        debounceTime: config.debounceTime ?? 0.2,
        scrub: config.scrub ?? 2,
        stagger: config.stagger ?? 0.05,
        triggerPosition: config.triggerPosition ?? '75%',
        reversable: config.reversable ?? false,
        ease: config.ease ?? 'power1.out',
        type: config.type ?? 'lines',
    });

    const {
        debounceTime,
        scrub,
        stagger,
        triggerPosition,
        reversable,
        ease,
        type,
    } = configRef.current;

    useMotion(
        ([{ default: gsap }, { default: SplitText }]) => {
            if (!ref.current) return;
            const ctx = gsap.context(() => {
                gsap.registerPlugin(SplitText);

                const splitText = new SplitText(ref.current, {
                    type: `lines${type !== 'lines' && `, ${type}`}`,
                    tag: 'div',
                });

                for (const line of splitText.lines) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'overflow-y-hidden';
                    wrapper.appendChild(line);
                    ref.current?.appendChild(wrapper);
                }

                gsap.from(splitText[type], {
                    scrollTrigger: {
                        trigger: ref.current,
                        scrub,
                        start: `top ${triggerPosition}`,
                        end: `bottom ${triggerPosition}`,
                        onScrubComplete: ({ animation, progress }) => {
                            if (!reversable && progress === 1) {
                                animation?.kill();
                            }
                        },
                    },
                    ease,
                    stagger: {
                        each: stagger,
                    },
                    y: '100%',
                });
            });
            return () => ctx.revert();
        },
        {
            debounceTime,
            observeElementResize: () => ref.current,
            load: { when: 'visible', ref },
            loader: () => [import('gsap'), import('gsap/SplitText')] as const,
        },
    );
    return (
        <Slot ref={ref} className={className}>
            {children}
        </Slot>
    );
};
