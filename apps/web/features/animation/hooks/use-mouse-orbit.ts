'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotion } from './use-motion';

interface UseMouseOrbitParams {
    target: string | (() => HTMLElement | SVGElement | null);
    container: string | (() => HTMLElement | SVGElement | null);
    svgOrigin?: string;
    rotationOffset?: number;
    smoothness?: number; // Higher = smoother. Defaults to 0.9 */
}

/**
 * A custom React hook that makes an element rotate to follow the mouse cursor on desktop
 * or animate with natural compass-like movements on mobile devices.
 *
 * @remarks
 * On desktop (pointer: fine), the hook rotates a target element based on mouse position,
 * creating an orbit effect with smooth exponential following.
 * On mobile/touch devices (pointer: coarse), it creates natural compass-like movements
 * with organic rotations that mimic a real compass behavior.
 *
 * @param params - Configuration object
 * @param params.target - Selector or function returning the element to rotate
 * @param params.container - Container for center calculation (desktop) or visibility detection
 * @param params.svgOrigin - Optional SVG transform origin (e.g., '124 124')
 * @param params.rotationOffset - Optional rotation offset in degrees (default: 0)
 * @param params.smoothness - Optional smoothness value 0.7-0.95 for desktop (default: 0.9)
 *
 * @example
 * ```jsx
 * const mouseFollowRef = useRef(null);
 * const loadScreenRef = useRef(null);
 *
 * useMouseOrbit({
 *  target: () => mouseFollowRef.current,
 *  container: () => loadScreenRef.current,
 * svgOrigin: '124 124',
 * rotationOffset: 90,
 * smoothness: 0.85
 * });
 * ```
 */
export const useMouseOrbit = (params: UseMouseOrbitParams) => {
    const {
        target,
        container,
        svgOrigin,
        rotationOffset = 0,
        smoothness = 0.9,
    } = params;

    const [isVisible, setIsVisible] = useState(false);

    // Use ref for proper ticker cleanup
    const enabledRef = useRef(isVisible);
    useEffect(() => {
        enabledRef.current = isVisible;
    }, [isVisible]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: container is a function ref or string
    useEffect(() => {
        const observeElement =
            typeof container === 'string'
                ? (document.querySelector(container) as
                      | HTMLElement
                      | SVGElement
                      | null)
                : container();

        if (!observeElement) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
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

    // Desktop/mouse animation
    useMotion(
        ([{ default: gsap }, { getMousePosition }]) => {
            const mouse = getMousePosition();
            let isInitialized = false;
            let smoothedTarget = 0;
            let updater: (() => void) | null = null;

            // Cache elements to avoid repeated DOM queries
            let cachedTargetElement: HTMLElement | SVGElement | null = null;
            let cachedContainerElement: HTMLElement | SVGElement | null = null;

            // Initialization
            const getTargetElement = () => {
                if (cachedTargetElement) return cachedTargetElement;
                const element =
                    typeof target === 'string'
                        ? (document.querySelector(target) as
                              | HTMLElement
                              | SVGElement
                              | null)
                        : target();
                if (element) cachedTargetElement = element;
                return element;
            };

            const getContainerElement = () => {
                if (cachedContainerElement) return cachedContainerElement;
                const element =
                    typeof container === 'string'
                        ? (document.querySelector(container) as
                              | HTMLElement
                              | SVGElement
                              | null)
                        : container();
                if (element) cachedContainerElement = element;
                return element;
            };

            // Initialize once - separate from element retrieval
            const initialize = () => {
                const targetElement = getTargetElement();
                const containerElement = getContainerElement();

                if (targetElement && containerElement && !isInitialized) {
                    const initProps: Record<string, unknown> = { rotation: 0 };
                    if (svgOrigin) {
                        initProps.svgOrigin = svgOrigin;
                    }

                    gsap.set(targetElement, initProps);
                    isInitialized = true;
                }
            };

            const startTicker = () => {
                if (updater) return;

                updater = gsap.ticker.add(() => {
                    if (!enabledRef.current) return;

                    if (!isInitialized) {
                        initialize();
                    }

                    const targetElement = cachedTargetElement;
                    const containerElement = cachedContainerElement;

                    if (!targetElement || !containerElement || !isInitialized)
                        return;

                    const mouseX = mouse.client.x;
                    const mouseY = mouse.client.y;
                    if (mouseX === 0 && mouseY === 0) return;

                    // Get element rect for center calculation
                    const rect = containerElement.getBoundingClientRect();
                    const elementCenterX = rect.left + rect.width / 2;
                    const elementCenterY = rect.top + rect.height / 2;

                    // Calculate angle from element center to mouse position
                    const deltaX = mouseX - elementCenterX;
                    const deltaY = mouseY - elementCenterY;
                    const angleRad = Math.atan2(deltaY, deltaX);
                    const angleDeg =
                        (angleRad * 180) / Math.PI + rotationOffset;
                    const rawTargetRotation =
                        angleDeg < 0 ? angleDeg + 360 : angleDeg;

                    // Get current rotation
                    const currentRotation =
                        Number(gsap.getProperty(targetElement, 'rotation')) ||
                        0;

                    // Normalize rotations to 0-360 range
                    const normalizedCurrent =
                        ((currentRotation % 360) + 360) % 360;
                    smoothedTarget = ((smoothedTarget % 360) + 360) % 360;

                    // Calculate shortest rotation path from smoothed target to raw target
                    let targetDelta = rawTargetRotation - smoothedTarget;
                    if (targetDelta > 180) {
                        targetDelta -= 360;
                    } else if (targetDelta < -180) {
                        targetDelta += 360;
                    }

                    // Apply exponential smoothing to the target (prevents oscillations)
                    const step = (1 - smoothness) * gsap.ticker.deltaRatio();
                    smoothedTarget += gsap.utils.interpolate(
                        0,
                        targetDelta,
                        step,
                    );

                    // Calculate shortest path from current to smoothed target
                    let rotationDelta = smoothedTarget - normalizedCurrent;
                    if (rotationDelta > 180) {
                        rotationDelta -= 360;
                    } else if (rotationDelta < -180) {
                        rotationDelta += 360;
                    }

                    // Apply smooth interpolation from current to smoothed target
                    const nextRotation =
                        normalizedCurrent +
                        gsap.utils.interpolate(0, rotationDelta, step);

                    gsap.set(targetElement, {
                        rotation: nextRotation,
                    });
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
        [isVisible],
    );

    // Mobile animation - natural compass movement
    useMotion(
        ([{ default: gsap }]) => {
            let isInitialized = false;
            let animationTimeout: NodeJS.Timeout | null = null;
            let currentTween: gsap.core.Tween | null = null;

            // Cache elements to avoid repeated DOM queries
            let cachedTargetElement: HTMLElement | SVGElement | null = null;
            let cachedContainerElement: HTMLElement | SVGElement | null = null;

            // Initialization
            const getTargetElement = () => {
                if (cachedTargetElement) return cachedTargetElement;
                const element =
                    typeof target === 'string'
                        ? (document.querySelector(target) as
                              | HTMLElement
                              | SVGElement
                              | null)
                        : target();
                if (element) cachedTargetElement = element;
                return element;
            };

            const getContainerElement = () => {
                if (cachedContainerElement) return cachedContainerElement;
                const element =
                    typeof container === 'string'
                        ? (document.querySelector(container) as
                              | HTMLElement
                              | SVGElement
                              | null)
                        : container();
                if (element) cachedContainerElement = element;
                return element;
            };

            // Initialize once
            const initialize = () => {
                const targetElement = getTargetElement();
                const containerElement = getContainerElement();

                if (targetElement && containerElement && !isInitialized) {
                    const initProps: Record<string, unknown> = {
                        rotation: 0,
                    };
                    if (svgOrigin) {
                        initProps.svgOrigin = svgOrigin;
                    }

                    gsap.set(targetElement, initProps);
                    isInitialized = true;
                }
            };

            const animateCompass = () => {
                if (!enabledRef.current) return;

                const targetElement = getTargetElement();
                if (!targetElement) return;

                // Generate random rotation change, minimum movement
                const isPositive = gsap.utils.random(0, 1) < 0.5;
                const rotationChange = isPositive
                    ? gsap.utils.random(100, 300)
                    : gsap.utils.random(-100, -300);

                const duration = gsap.utils.random(5, 10);

                if (currentTween) {
                    currentTween.kill();
                }

                currentTween = gsap.to(targetElement, {
                    rotation: `+=${rotationChange}`,
                    duration: duration,
                    ease: 'back.inOut(1.7)',
                    onComplete: () => {
                        if (!enabledRef.current) return;
                        const delay = gsap.utils.random(0, 10);
                        animationTimeout = setTimeout(animateCompass, delay);
                    },
                });
            };

            const startAnimation = () => {
                if (!isInitialized) {
                    initialize();
                }

                animateCompass();
            };

            const stopAnimation = () => {
                if (animationTimeout) {
                    clearTimeout(animationTimeout);
                    animationTimeout = null;
                }
                if (currentTween) {
                    currentTween.kill();
                    currentTween = null;
                }
            };

            if (isVisible) {
                startAnimation();
            }

            return () => {
                stopAnimation();
            };
        },
        () => ({
            mediaQueryList: () => matchMedia('(pointer: coarse)'), // Mobile/touch devices
            load: { when: 'load' },
            loader: () => [import('gsap')] as const,
        }),
        [isVisible],
    );
};
