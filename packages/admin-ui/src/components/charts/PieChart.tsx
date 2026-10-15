import type { PartitionResult } from '@repo/admin-contract';
import { totalOf } from './scale';
import { DONUT, slicePath } from './slice-path';
import { useChartTooltip } from './tooltip';

// the accent of the bars first, then shades of it, so a pie reads as the same chart family
const SLICE_COLORS = [
    'var(--chart)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

// as many slices as there are colours, the smallest of the rest folded into one, so no two look alike
const folded = (slices: PartitionResult['slices']) => {
    if (slices.length <= SLICE_COLORS.length) return slices;

    const kept = slices.slice(0, SLICE_COLORS.length - 1);
    const rest = slices.slice(SLICE_COLORS.length - 1);

    return [
        ...kept,
        {
            label: 'Other',
            value: totalOf(rest),
        },
    ];
};

/** The donut of slices, largest first as given, each with a tooltip, and the total in its hole. */
function Donut({
    slices,
    total,
    label,
}: {
    slices: { key: string; value: number; text: string }[];
    total: string;
    label: string;
}) {
    const { show, hide, tooltip } = useChartTooltip();
    const sum = totalOf(slices) || 1;
    const shown = slices.filter(({ value }) => value > 0).length;
    let start = 0;

    return (
        <div className="relative size-40 shrink-0" data-chart>
            <svg viewBox="0 0 100 100" className="size-full">
                <title>{label}</title>
                {slices.map(({ key, value, text }, i) => {
                    const from = start;

                    start += (value / sum) * Math.PI * 2;

                    if (value <= 0) return null;

                    const hover = {
                        className: 'transition-opacity hover:opacity-80',
                        onMouseLeave: hide,
                        onMouseMove: show(text),
                    };

                    // one slice is the whole ring, with no edges to round
                    return shown === 1 ? (
                        <circle
                            key={key}
                            cx="50"
                            cy="50"
                            r={(DONUT.outer + DONUT.inner) / 2}
                            fill="none"
                            strokeWidth={DONUT.outer - DONUT.inner}
                            style={{ stroke: SLICE_COLORS[i] }}
                            {...hover}
                        />
                    ) : (
                        <path
                            key={key}
                            d={slicePath({ from, to: start })}
                            strokeWidth={DONUT.corner * 2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            style={{
                                fill: SLICE_COLORS[i],
                                stroke: SLICE_COLORS[i],
                            }}
                            {...hover}
                        />
                    );
                })}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <span className="text-xl font-bold tabular-nums">{total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
            </div>
            {tooltip}
        </div>
    );
}

/** Shares of a whole: a donut with the total in its hole, and a legend of each share beside it. */
export function PieChart({
    slices: all,
    format,
    label,
}: {
    slices: PartitionResult['slices'];
    format: (value: number) => string;
    label: string;
}) {
    const slices = folded(all);
    const total = totalOf(slices);
    const share = (value: number) => Math.round((value / (total || 1)) * 100);

    return (
        <div className="@container flex flex-1 flex-col justify-center">
            <div className="flex flex-col items-center gap-6 @sm:flex-row">
                <Donut
                    label={label}
                    total={format(total)}
                    slices={slices.map(({ label, value }) => ({
                        key: label,
                        value,
                        text: `${label}: ${format(value)} · ${share(value)}%`,
                    }))}
                />
                <ul className="grid w-full min-w-0 flex-1 gap-2">
                    {slices.map(({ label, value }, i) => (
                        <li
                            key={label}
                            className="flex items-center gap-2 text-sm"
                        >
                            <span
                                className="size-2.5 shrink-0 rounded-[3px]"
                                style={{ background: SLICE_COLORS[i] }}
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">
                                {label}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                                {format(value)} · {share(value)}%
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
