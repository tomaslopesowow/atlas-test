'use client';

import { useEffect, useRef, useState } from 'react';
import { getCoordinatesFromNormalizedPosition } from '@/features/animation/utils/get-coordinates-from-normalized-position';
import { useMotion } from './use-motion';

interface UseMouseCoordinatesParams {
    target: () => HTMLElement | SVGElement | null;
    smoothness?: number;
    minChange?: number;
}

/**
 * A custom React hook that displays animated geographic coordinates based on mouse position.
 *
 * @remarks
 * This hook maps the mouse position on screen to geographic coordinates and animates
 * the text smoothly. The hook automatically manages visibility using IntersectionObserver
 * to stop the animation when the element is not visible.
 *
 * @param params - Configuration object
 * @param params.target - Function returning the element to display coordinates (use refs)
 * @param params.smoothness - Smoothness for coordinate interpolation 0.7-0.95 (default: 0.9)
 * @param params.minChange - Minimum change in normalized units (0-1) to trigger DOM update (default: 0.05)
 *
 * @example
 * ```jsx
 * const coordinatesRef = useRef(null);
 *
 * useMouseCoordinates({
 *   target: () => coordinatesRef.current,
 * });
 * ```
 */
export const useMouseCoordinates = (params: UseMouseCoordinatesParams) => {
    const {
        target,
        smoothness = 0.9, // Lower = more responsive (max: 0.99, min: 0.01)
        minChange = 0.05, // Minimum change in normalized units (0-1) to trigger DOM update
    } = params;

    const [isVisible, setIsVisible] = useState(false);

    // Use ref for proper ticker cleanup
    const enabledRef = useRef(isVisible);

    // biome-ignore lint/correctness/useExhaustiveDependencies: some reason
    useEffect(() => {
        const observeElement = target();

        if (!observeElement) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
                enabledRef.current = entry.isIntersecting;
            },
            {
                rootMargin: '0px',
            },
        );

        observer.observe(observeElement);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        enabledRef.current = isVisible;
    }, [isVisible]);

    useMotion(
        ([{ default: gsap }, { getMousePosition }]) => {
            const mouse = getMousePosition();
            let smoothedX = 0.5;
            let smoothedY = 0.5;
            let updater: (() => void) | null = null;

            let cachedTargetElement: HTMLElement | SVGElement | null = null;

            const getTargetElement = () => {
                if (cachedTargetElement) return cachedTargetElement;
                const element = target();
                if (element) cachedTargetElement = element;
                return element;
            };

            // Track last displayed position for change detection
            let lastDisplayedX = smoothedX;
            let lastDisplayedY = smoothedY;

            const startTicker = () => {
                if (updater) return;

                updater = gsap.ticker.add(() => {
                    if (!enabledRef.current) return;

                    const targetElement =
                        cachedTargetElement || getTargetElement();

                    if (!targetElement) return;

                    const mouseX = mouse.client.x;
                    const mouseY = mouse.client.y;

                    if (mouseX === 0 && mouseY === 0) return;

                    // Normalize mouse coordinates to 0-1 range
                    const targetX = mouseX / window.innerWidth;
                    const targetY = mouseY / window.innerHeight;

                    const step = (1 - smoothness) * gsap.ticker.deltaRatio();
                    smoothedX = gsap.utils.interpolate(
                        smoothedX,
                        targetX,
                        step,
                    );
                    smoothedY = gsap.utils.interpolate(
                        smoothedY,
                        targetY,
                        step,
                    );

                    // Only update DOM if change exceeds threshold
                    const xChange = Math.abs(smoothedX - lastDisplayedX);
                    const yChange = Math.abs(smoothedY - lastDisplayedY);
                    const hasSignificantChange =
                        xChange >= minChange || yChange >= minChange;

                    if (hasSignificantChange && targetElement) {
                        targetElement.textContent =
                            getCoordinatesFromNormalizedPosition(
                                smoothedX,
                                smoothedY,
                            );
                        lastDisplayedX = smoothedX;
                        lastDisplayedY = smoothedY;
                    }
                });
            };

            const stopTicker = () => {
                if (updater) {
                    gsap.ticker.remove(updater);
                    updater = null;
                }
            };

            if (isVisible) {
                startTicker();
            }

            return () => {
                stopTicker();
            };
        },
        () => ({
            mediaQueryList: () => matchMedia('(pointer: fine)'),
            load: { when: 'load' },
            loader: () =>
                [import('gsap'), import('@owowagency/gsap-motion')] as const,
        }),
        [isVisible, minChange],
    );
};
