import type { PartitionResult } from '@repo/admin-contract';
import { totalOf } from './scale';

/** Shares of a whole as a bar each, largest first as given, with the count and share above it. */
export function ShareBars({
    slices,
    format,
}: {
    slices: PartitionResult['slices'];
    format: (value: number) => string;
}) {
    const total = totalOf(slices) || 1;

    return (
        <ul className="grid gap-3">
            {slices.map(({ label, value }) => (
                <li key={label} className="grid gap-1.5">
                    <span className="flex justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-medium">
                            {label}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                            {format(value)} ·{' '}
                            {Math.round((value / total) * 100)}%
                        </span>
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                        <span
                            className="block h-full rounded-full bg-chart"
                            style={{ width: `${(value / total) * 100}%` }}
                        />
                    </span>
                </li>
            ))}
        </ul>
    );
}
