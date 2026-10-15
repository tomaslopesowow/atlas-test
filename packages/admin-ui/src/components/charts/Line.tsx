import { useId, useState } from 'react';
import { linePath } from './line-path';
import type { PlotPoint } from './TrendChart';
import { useChartTooltip } from './tooltip';

/** The line of a trend over a shaded area, each point centred in its column, which hovered marks it. */
export function Line({ points }: { points: PlotPoint[] }) {
    const { show, hide, tooltip } = useChartTooltip();
    const [active, setActive] = useState<number>();
    // useId's colons and guillemets do not belong in a url(#…)
    const shade = `shade-${useId().replace(/[^\w-]/g, '')}`;
    const x = (i: number) => ((i + 0.5) / points.length) * 100;
    const y = (share: number) => 100 - share;
    const line = linePath(
        points.map(({ share }, i) => ({ x: x(i), y: y(share) })),
    );
    const hovered = active === undefined ? undefined : points[active];

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer's hover only; the chart is one labelled image to a screen reader
        <div
            className="relative"
            data-chart
            onMouseLeave={() => {
                hide();
                setActive(undefined);
            }}
        >
            {/* stretched to the plot, the line kept as thick as drawn */}
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id={shade} x1="0" x2="0" y1="0" y2="1">
                        <stop
                            offset="0%"
                            style={{
                                stopColor: 'var(--chart)',
                                stopOpacity: 0.35,
                            }}
                        />
                        <stop
                            offset="100%"
                            style={{
                                stopColor: 'var(--chart)',
                                stopOpacity: 0,
                            }}
                        />
                    </linearGradient>
                </defs>
                {points.length > 0 && (
                    <path
                        d={`${line} L ${x(points.length - 1)} 100 L ${x(0)} 100 Z`}
                        fill={`url(#${shade})`}
                    />
                )}
                <path
                    d={line}
                    fill="none"
                    style={{ stroke: 'var(--chart)' }}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            {/* a single point has no line to draw, so it shows as its dot */}
            {points.length === 1 && points[0] && (
                <div
                    className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-chart"
                    style={{ left: `${x(0)}%`, top: `${y(points[0].share)}%` }}
                />
            )}
            {hovered && active !== undefined && (
                <>
                    <div
                        className="pointer-events-none absolute inset-y-0 w-px bg-muted-foreground/30"
                        style={{ left: `${x(active)}%` }}
                    />
                    <div
                        className="pointer-events-none absolute size-3 -translate-1/2 rounded-full border-2 border-background bg-chart"
                        style={{
                            left: `${x(active)}%`,
                            top: `${y(hovered.share)}%`,
                        }}
                    />
                </>
            )}
            <div className="absolute inset-0 flex">
                {points.map(({ key, text }, i) => (
                    // biome-ignore lint/a11y/noStaticElementInteractions: as above
                    <div
                        key={key}
                        className="h-full flex-1"
                        onMouseMove={(event) => {
                            setActive(i);
                            show(text)(event);
                        }}
                    />
                ))}
            </div>
            {tooltip}
        </div>
    );
}
