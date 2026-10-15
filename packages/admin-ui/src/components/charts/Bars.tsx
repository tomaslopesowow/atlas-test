import type { PlotPoint } from './TrendChart';
import { useChartTooltip } from './tooltip';

export const BAR_GAP = 'gap-1.5 sm:gap-3';

/** The bars of a trend, each with a tooltip while the cursor is over the bar itself. */
export function Bars({ points }: { points: PlotPoint[] }) {
    const { show, hide, tooltip } = useChartTooltip();

    return (
        <div className={`relative flex items-end ${BAR_GAP}`} data-chart>
            {points.map(({ key, share, text }) => (
                <div key={key} className="flex h-full flex-1 items-end">
                    {/* the bar alone answers the pointer, not the empty column above it */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer's hover only; the chart is one labelled image to a screen reader */}
                    <div
                        className="w-full rounded-t-md bg-chart transition-opacity hover:opacity-80"
                        style={{ height: `${share}%` }}
                        onMouseLeave={hide}
                        onMouseMove={show(text)}
                    />
                </div>
            ))}
            {tooltip}
        </div>
    );
}
