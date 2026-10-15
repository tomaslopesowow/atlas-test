'use client';

import { cn } from '@/features/shadcn/utils/ui';
import { DEFAULT_RADIUS_REM } from './shared';

const DEFAULT_OVERLAP_PERCENT = 25;
const DEFAULT_STROKE_WIDTH_PX = 1;

interface OverlappingCirclesProps extends React.SVGProps<SVGSVGElement> {
    radiusRem?: number;
    overlapPercent?: number;
    strokeWidthPx?: number;
    hasPathAnimation?: boolean;
    activeCircleIndex?: number | null;
}

function calculateDimensions(
    radius: number,
    overlapPercent: number,
    strokeWidth: number,
) {
    const overlap = (radius * overlapPercent) / 100;
    const centerDistance = 2 * radius - overlap;
    const verticalOffset = (Math.sqrt(3) / 2) * centerDistance;

    const circlePositions = [
        { cx: radius, cy: radius },
        { cx: radius + centerDistance / 2, cy: verticalOffset + radius },
        { cx: radius - centerDistance / 2, cy: verticalOffset + radius },
    ];

    const totalHeight = verticalOffset + 2 * radius + strokeWidth;
    const totalWidth = 2 * radius + centerDistance + strokeWidth;

    const viewBoxMinX = -centerDistance / 2 - strokeWidth / 2;
    const viewBoxMinY = -strokeWidth / 2;
    const viewBoxWidth = totalWidth + strokeWidth;
    const viewBoxHeight = totalHeight + strokeWidth;

    const originY = radius + (2 / 3) * verticalOffset;
    return {
        circlePositions,
        totalHeight,
        totalWidth,
        viewBox: `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`,
        originY,
    };
}

export const OverlappingCircles = ({
    radiusRem = DEFAULT_RADIUS_REM,
    overlapPercent = DEFAULT_OVERLAP_PERCENT,
    strokeWidthPx = DEFAULT_STROKE_WIDTH_PX,
    hasPathAnimation = false,
    activeCircleIndex = null,
    className,
    style,
    ...props
}: OverlappingCirclesProps) => {
    // Convert strokeWidth to rem for consistent calculations (assuming 16px base)
    const strokeWidthRem = strokeWidthPx / 16;
    const { circlePositions, totalHeight, totalWidth, viewBox, originY } =
        calculateDimensions(radiusRem, overlapPercent, strokeWidthRem);

    return (
        <svg
            height={`${totalHeight}rem`}
            width={`${totalWidth}rem`}
            viewBox={viewBox}
            className={cn(
                'fill-none pointer-events-none transition-transform',
                className,
            )}
            style={{ transformOrigin: `50% ${originY}rem`, ...style }}
            {...props}
        >
            <title>Overlapping Circles</title>
            {circlePositions.map((position, index) => (
                <circle
                    id={hasPathAnimation ? `path-${index}` : undefined}
                    key={String(index)}
                    r={radiusRem}
                    strokeWidth={strokeWidthRem}
                    stroke="currentColor"
                    className={cn(
                        activeCircleIndex !== null &&
                            index === activeCircleIndex &&
                            'stroke-primary',
                        activeCircleIndex !== null &&
                            index !== activeCircleIndex &&
                            'stroke-secondary',
                        'transition-[stroke] duration-500 fill-none stroke-primary',
                    )}
                    {...position}
                />
            ))}
        </svg>
    );
};
