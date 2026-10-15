'use client';
import { Slot } from '@radix-ui/react-slot';
import { type ComponentProps, useRef } from 'react';
import { useMotion } from '../hooks/use-motion';
import { createPhysicsBasedMotion } from '../utils/second-order-dynamics';

export type ParallaxProps = ComponentProps<'div'> & {
    scrollPhysics?: Parameters<typeof createPhysicsBasedMotion>;
    depth?: number;
    debounceTime?: number;
    triggerElement?: HTMLElement | null;
};

const PARALLAX_STEP = 0.05;

/**
 * Parallax component for depth effect.
 * @param {Parameters<typeof createPhysicsBasedMotion>} props.scrollPhysics - The physics-based motion configuration, consisting of speed, damping, response and x0.
 * @param {number} props.depth - The depth of the parallax effect in pixels. Will also be used to calculate the height of the child element.
 * @param {number} props.debounceTime - The debounce time, used when recalculating values after resizing.
 * @param {HTMLElement} props.triggerElement - The element that is used as trigger in the ScrollTrigger. Defaults to the target element.
 * @example
 * <Parallax>
 *      <ImageCMS image={image} />
 * </Parallax>
 */

export const Parallax = ({ children, ...config }: ParallaxProps) => {
    const innerRef = useRef<HTMLDivElement>(null);

    const configRef = useRef({
        scrollPhysics: config.scrollPhysics ?? [1, 0.8, -1, 0],
        depth: config.depth ?? 400,
        debounceTime: config.debounceTime ?? 0.2,
    });

    const { scrollPhysics, depth, debounceTime } = configRef.current;

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            if (!innerRef.current) return;

            const scrollPBM = createPhysicsBasedMotion(...scrollPhysics);
            const setY = gsap.quickSetter(innerRef.current, 'y', 'px');

            gsap.registerPlugin(ScrollTrigger);

            const _ScrollTrigger = ScrollTrigger.create({
                trigger: config.triggerElement ?? innerRef.current,
                start: 'top bottom',
                end: 'bottom top',
            });

            const updater = gsap.ticker.add(() => {
                const deltaRatio = gsap.ticker.deltaRatio();

                const scrollY = scrollPBM.update(
                    deltaRatio * PARALLAX_STEP,
                    _ScrollTrigger.progress,
                );

                setY(-scrollY * depth + depth / 2);
            });

            return () => gsap.ticker.remove(updater);
        },
        {
            debounceTime,
            observeElementResize: () => innerRef.current,
            load: {
                when: 'visible',
                ref: innerRef,
                options: { rootMargin: `${Math.abs(depth)}px` },
            },
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
        },
    );

    return <Slot ref={innerRef}>{children}</Slot>;
};
