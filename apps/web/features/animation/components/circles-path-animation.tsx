'use client';

import { memo, useRef, useState } from 'react';
import { OverlappingCircles } from '@/components/common/overlapping-circles';
import { usePathAnimation } from '@/features/animation/hooks/use-path-animation';
import { cn } from '@/features/shadcn/utils/ui';
import type { PathLabels } from '@/types/shared';

type PathConfig = {
    start: number;
    end: number;
    duration: number;
};

interface CirclesPathAnimationProps {
    labels?: PathLabels;
    activeIndex?: number;
    rotation?: number;
    rotationDuration?: number;
    isActive?: boolean;
    isRotating?: boolean;
    className?: string;
    pathConfigs?: PathConfig[];
}

const DEFAULT_PATH_CONFIGS = [
    {
        start: 0,
        end: 1,
        duration: 80,
    },
    {
        start: 0,
        end: 1,
        duration: 80,
    },
    {
        start: 0,
        end: 1,
        duration: 80,
    },
];

const CirclesPathAnimationComponent = ({
    labels,
    activeIndex,
    rotation,
    rotationDuration,
    isActive = true,
    isRotating = false,
    pathConfigs,
    className,
    ...props
}: CirclesPathAnimationProps) => {
    const pathMarkerRefs = [
        useRef<HTMLElement>(null),
        useRef<HTMLElement>(null),
        useRef<HTMLElement>(null),
    ];

    const mergedPathConfigs = [
        {
            pathId: 'path-0',
            ...DEFAULT_PATH_CONFIGS[0],
            ...(pathConfigs?.[0] ?? {}),
        },
        {
            pathId: 'path-1',
            ...DEFAULT_PATH_CONFIGS[1],
            ...(pathConfigs?.[1] ?? {}),
        },
        {
            pathId: 'path-2',
            ...DEFAULT_PATH_CONFIGS[2],
            ...(pathConfigs?.[2] ?? {}),
        },
    ];
    const [isLoaded, setIsLoaded] = useState(false);

    // Subtract 0.25 from points cuz for some reason GSAP starts the animation from the most right point of the circles
    // Makes more sense to start from the top point of the circles
    usePathAnimation({
        pathId: mergedPathConfigs[0].pathId,
        targetRef: pathMarkerRefs[(activeIndex ?? 0) % 3],
        isActive: labels !== null,
        duration: mergedPathConfigs[0].duration,
        start: mergedPathConfigs[0].start - 0.25,
        end: mergedPathConfigs[0].end - 0.25,
        dependencies: [activeIndex],
        onLoad: () => {
            setIsLoaded(true);
        },
    });
    usePathAnimation({
        pathId: mergedPathConfigs[1].pathId,
        targetRef: pathMarkerRefs[((activeIndex ?? 0) + 1) % 3],
        isActive: labels !== null,
        duration: mergedPathConfigs[1].duration,
        start: mergedPathConfigs[1].start - 0.25,
        end: mergedPathConfigs[1].end - 0.25,
        dependencies: [activeIndex],
    });
    usePathAnimation({
        pathId: mergedPathConfigs[2].pathId,
        targetRef: pathMarkerRefs[((activeIndex ?? 0) + 2) % 3],
        isActive: labels !== null,
        duration: mergedPathConfigs[2].duration,
        start: mergedPathConfigs[2].start - 0.25,
        end: mergedPathConfigs[2].end - 0.25,
        dependencies: [activeIndex],
    });

    return (
        <div
            className={cn(
                'pointer-events-none overflow-visible relative opacity-0 transition-opacity duration-1500',
                isLoaded && 'opacity-100',
                className,
            )}
            {...props}
        >
            <OverlappingCircles
                style={{
                    ...(rotation !== undefined && {
                        transform: `rotate(${rotation}deg)`,
                        transitionTimingFunction: 'cubic-bezier(.5,-0.01,0,1)',
                        transitionDuration: `${rotationDuration}ms`,
                    }),
                }}
                activeCircleIndex={activeIndex}
            />
            {/* Hidden Copy of above element for path animations, without rotation complexity */}
            <OverlappingCircles
                className="absolute top-0 opacity-0"
                hasPathAnimation={true}
            />
            {labels?.map((label, index) => (
                <div
                    key={mergedPathConfigs[index]?.pathId ?? `path-${index}`}
                    ref={(el) => {
                        if (!el) return;
                        pathMarkerRefs[index].current = el;
                    }}
                    className={cn(
                        'max-sm:hidden',
                        'absolute transition-[opacity,blur] duration-1000 will-change-transform',
                        activeIndex !== undefined &&
                            activeIndex !== index &&
                            'opacity-30',
                        (!isActive || isRotating) && 'blur-xs opacity-0',
                    )}
                >
                    <div className="w-1 h-1 bg-invert absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute flex flex-col uppercase font-mono text-2xs text-left whitespace-nowrap pl-3">
                        {typeof label === 'string' ? <p>{label}</p> : label}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const CirclesPathAnimation = memo(CirclesPathAnimationComponent);
