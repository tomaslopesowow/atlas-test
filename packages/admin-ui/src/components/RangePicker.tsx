import type { DashboardResponse, MetricRange } from '@repo/admin-contract';
import { Link } from 'react-router';
import { formatDay } from '@/lib/format';
import { DateRangeForm } from './DateRangeForm';
import { CalendarIcon } from './icons';

/** The one range of a page's cards, as the days it covers: a preset, or days picked on the calendar. */
export function RangePicker({
    ranges,
    covered,
    query = {},
}: {
    ranges: MetricRange[];
    covered: DashboardResponse['range'];
    /** The page's other parameters, which a new range keeps. */
    query?: Record<string, string | undefined>;
}) {
    const kept = Object.entries(query).filter(
        (entry): entry is [string, string] =>
            entry[1] !== undefined &&
            !['range', 'from', 'to', 'page'].includes(entry[0]),
    );
    const days = covered.from
        ? `${formatDay(covered.from)} – ${formatDay(covered.to)}`
        : `Until ${formatDay(covered.to)}`;

    return (
        // a new range remounts it, closing the menu
        <details key={`${covered.value}${covered.from}`} className="relative">
            <summary className="btn btn-outline">
                <CalendarIcon />
                {/* days picked on the calendar have no name beyond the days themselves */}
                {covered.value.includes('..')
                    ? days
                    : `${covered.label} · ${days}`}
            </summary>
            <div className="popover right-0 grid w-72 gap-3 p-3">
                <nav className="grid gap-0.5" aria-label="Range">
                    {ranges.map(({ value, label }) => (
                        <Link
                            key={value}
                            to={`?${new URLSearchParams([...kept, ['range', value]])}`}
                            className="menu-item"
                            aria-current={value === covered.value || undefined}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
                <DateRangeForm
                    kept={kept}
                    from={covered.from ?? ''}
                    to={covered.to}
                    required
                    className="grid grid-cols-2 gap-2 border-t pt-3"
                />
            </div>
        </details>
    );
}
