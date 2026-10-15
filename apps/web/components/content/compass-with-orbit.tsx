'use client';

import { useEffect, useRef, useState } from 'react';
import Compass from '@/components/icons/compass';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import { useMouseOrbit } from '@/features/animation/hooks/use-mouse-orbit';

interface CompassWithOrbitProps extends Omit<SvgIconProps, 'id'> {
    progress?: number | null;
    rotateFixedElements?: boolean;
    svgOrigin?: string;
    rotationOffset?: number;
    smoothness?: number;
}

export const CompassWithOrbit = ({
    progress,
    rotateFixedElements,
    svgOrigin = '124 124',
    rotationOffset = 90,
    smoothness = 0.9,
    className,
    ...svgProps
}: CompassWithOrbitProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [targetElement, setTargetElement] = useState<SVGGElement | null>(
        null,
    );

    useEffect(() => {
        if (containerRef.current) {
            const mouseFollowElement = containerRef.current.querySelector(
                '.mouse-follow',
            ) as SVGGElement | null;
            if (mouseFollowElement) {
                setTargetElement(mouseFollowElement);
            }
        }
    }, []);

    useMouseOrbit({
        target: () => targetElement,
        container: () => containerRef.current,
        svgOrigin,
        rotationOffset,
        smoothness,
    });

    return (
        <div ref={containerRef}>
            <Compass
                {...svgProps}
                className={className}
                progress={progress}
                rotateFixedElements={rotateFixedElements}
            />
        </div>
    );
};
