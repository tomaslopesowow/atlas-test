import type { TrendResult } from '@repo/admin-contract';
import { BAR_GAP, Bars } from './Bars';
import { Line } from './Line';
import { scaleTop } from './scale';

/** A point as a chart plots it: its share of the scale, from 0 to 100, and its tooltip. */
export interface PlotPoint {
    key: string;
    share: number;
    text: string;
}

// `9 Oct`, `Oct` (with the year when the points span several) or `2026`
function axisLabel(label: string, years: boolean) {
    if (label.length === 4) return label;

    const date = new Date(
        `${label.length === 7 ? `${label}-01` : label}T00:00:00Z`,
    );

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        month: 'short',
        ...(label.length === 7
            ? years && { year: '2-digit' }
            : { day: 'numeric' }),
    }).format(date);
}

/** A trend as bars or a line, with a scale beside it and dates under it; shorter for a narrow card. */
export function TrendChart({
    points,
    format,
    label,
    short,
    line,
}: {
    points: TrendResult['points'];
    format: (value: number) => string;
    label: string;
    short: boolean;
    line: boolean;
}) {
    const top = scaleTop(
        Math.max(0, ...points.map(({ value }) => value)),
        points.every(({ value }) => Number.isInteger(value)),
    );
    const years =
        new Set(points.map(({ label }) => label.slice(0, 4))).size > 1;
    // at most a dozen labels under the plot
    const every = Math.ceil(points.length / 12);
    const plotted = points.map(({ label, value }) => ({
        key: label,
        share: (value / top) * 100,
        text: `${axisLabel(label, years)}: ${format(value)}`,
    }));

    // drawn for the eye; a screen reader hears each point's date and value instead
    return (
        <figure
            className={`@container grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 ${short ? 'grid-rows-[80px_auto]' : 'grid-rows-[260px_auto]'}`}
            aria-label={label}
        >
            <ul className="sr-only">
                {plotted.map(({ key, text }) => (
                    <li key={key}>{text}</li>
                ))}
            </ul>
            <div
                className="flex flex-col justify-between text-right text-xs leading-none text-muted-foreground tabular-nums"
                aria-hidden
            >
                {[1, 0.75, 0.5, 0.25, 0].map((share) => (
                    <span key={share}>{format(top * share)}</span>
                ))}
            </div>
            <div className="contents" aria-hidden>
                {line ? <Line points={plotted} /> : <Bars points={plotted} />}
            </div>
            {/* spaced as the plot spaces its points, so each date sits under its own; a line's are centred in columns with no gap */}
            <div
                className={`col-start-2 flex ${line ? '' : BAR_GAP}`}
                aria-hidden
            >
                {points.map(({ label }, i) => (
                    <span
                        key={label}
                        className="min-w-0 flex-1 text-center text-xs whitespace-nowrap text-muted-foreground"
                    >
                        {i % every === 0 && (
                            // every other one only where there is room for them all
                            <span
                                className={
                                    (i / every) % 2
                                        ? 'invisible @lg:visible'
                                        : undefined
                                }
                            >
                                {axisLabel(label, years)}
                            </span>
                        )}
                    </span>
                ))}
            </div>
        </figure>
    );
}
