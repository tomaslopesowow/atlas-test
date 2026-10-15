'use client';

import { type DependencyList, useRef } from 'react';
import { useMotion } from '@/features/animation/hooks/use-motion';

interface UsePathAnimationProps {
    pathId: string;
    targetRef: React.RefObject<HTMLElement | null>;
    isActive: boolean;
    duration?: number;
    start?: number;
    end?: number;
    dependencies?: DependencyList | DependencyList[number];
    onLoad?: () => void;
}

export const usePathAnimation = ({
    pathId,
    targetRef,
    isActive,
    duration = 60,
    start = 0,
    end = 1,
    dependencies,
    onLoad,
}: UsePathAnimationProps) => {
    const animationRef = useRef<GSAPTween>(null);

    const additionalDependencies = [dependencies].flat();

    useMotion(
        ([{ default: gsap }, { default: MotionPathPlugin }]) => {
            if (!targetRef.current) return;
            gsap.registerPlugin(MotionPathPlugin);
            animationRef.current?.kill();

            // Pretty sure this will break when there is multiple OverlappingCircles components on the page, but this is something to fix later.
            const pathElement = document.getElementById(
                pathId.replace('#', ''),
            ) as SVGPathElement | null;
            if (!pathElement) {
                console.error(`Path element not found: #${pathId}`);
                return;
            }

            const path = MotionPathPlugin.convertToPath(pathElement)[0];
            animationRef.current = gsap.to(targetRef.current, {
                duration,
                repeat: -1,
                yoyo: true,
                ease: 'none',
                paused: true,
                motionPath: {
                    path,
                    align: path,
                    autoRotate: false,
                    start,
                    end,
                },
            });

            onLoad?.();

            if (isActive) {
                animationRef.current?.play();
            }

            return () => {
                if (animationRef.current) {
                    animationRef.current.kill();
                    animationRef.current = null;
                }
            };
        },
        {
            loader: () =>
                [import('gsap'), import('gsap/MotionPathPlugin')] as const,
            load: {
                when: 'load',
            },
            observeWindowResize: () => true,
        },
        [pathId, start, end, isActive, ...additionalDependencies],
    );

    // Make sure is not running when section is inactive
    useMotion(
        () => {
            if (animationRef.current) {
                if (isActive) {
                    animationRef.current.play();
                } else {
                    animationRef.current.pause();
                }
            }
        },
        {
            loader: () => [new Promise((resolve) => resolve(true))],
            load: { when: 'idle' },
        },
        [isActive],
    );

    const reset = () => {
        animationRef.current?.restart();
    };

    const getProgress = () => {
        const animationProgress = animationRef.current?.progress() ?? 0;
        return start + animationProgress * (end - start);
    };

    return { reset, getProgress };
};
