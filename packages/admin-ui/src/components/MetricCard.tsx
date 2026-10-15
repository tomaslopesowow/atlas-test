import type {
    DashboardResponse,
    MetricResult,
    MetricSchema,
    MetricWidth,
    TableRow,
} from '@repo/admin-contract';
import { Link } from 'react-router';
import { initials } from '@/lib/format';
import { recordHref } from '@/lib/navigation';
import { PieChart } from './charts/PieChart';
import { ShareBars } from './charts/ShareBars';
import { totalOf } from './charts/scale';
import { TrendChart } from './charts/TrendChart';
import { Skeleton } from './Skeleton';

const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 1,
    signDisplay: 'always',
});

// by the room the grid has, not the window's, so a narrow grid gives each card more of a row
const WIDTHS: Record<MetricWidth, string> = {
    '1/4': 'col-span-12 @md:col-span-6 @4xl:col-span-3',
    '1/3': 'col-span-12 @md:col-span-6 @3xl:col-span-4',
    '1/2': 'col-span-12 @3xl:col-span-6',
    '2/3': 'col-span-12 @3xl:col-span-8',
    '3/4': 'col-span-12 @3xl:col-span-9',
    full: 'col-span-12',
};

/** The cards of a page, each with its result or why it has none; a placeholder each while `cards` loads. */
export function MetricCards({
    metrics,
    cards,
}: {
    metrics: MetricSchema[];
    cards: DashboardResponse['cards'] | undefined;
}) {
    const results = new Map(cards?.map(({ name, result }) => [name, result]));

    // cards keep their own height rather than stretching to the tallest of their row
    return (
        <div className="@container grid grid-cols-12 items-start gap-4">
            {metrics.map((metric) => {
                const result = results.get(metric.name);
                const chart =
                    metric.type === 'trend' || metric.type === 'partition';

                return (
                    <section
                        key={metric.name}
                        // charts side by side match heights; numbers and lists keep their own
                        className={`card flex min-w-0 flex-col gap-4 p-6 ${WIDTHS[metric.width]} ${chart ? 'self-stretch' : ''}`}
                        aria-label={metric.label}
                    >
                        <h2
                            className={`whitespace-nowrap ${
                                metric.type === 'value'
                                    ? 'text-sm font-medium'
                                    : 'leading-none font-semibold'
                            }`}
                        >
                            {metric.label}
                        </h2>
                        {!cards ? (
                            <Skeleton
                                className={
                                    metric.type === 'value'
                                        ? 'h-8 w-24'
                                        : metric.width === '1/4'
                                          ? 'h-24 w-full'
                                          : 'h-64 w-full'
                                }
                            />
                        ) : result ? (
                            <CardBody metric={metric} result={result} />
                        ) : (
                            <p className="text-sm text-destructive">
                                Could not be calculated
                            </p>
                        )}
                    </section>
                );
            })}
        </div>
    );
}

function Change({
    value,
    previous,
    comparedWith,
    format,
}: {
    value: number;
    previous: number | null;
    comparedWith?: string;
    format: (n: number) => string;
}) {
    if (previous === null) return null;

    const from = comparedWith ? ` from ${comparedWith}` : '';

    if (value === previous)
        return <p className="text-xs text-muted-foreground">No change{from}</p>;

    // a share of nothing is no number, so a change from none says by how much; a share of a
    // negative is of its size, so a rise reads as one whatever the sign
    const change =
        previous === 0
            ? `${value > 0 ? '+' : ''}${format(value)}`
            : `${percent.format(((value - previous) / Math.abs(previous)) * 100)}%`;

    return (
        <p className="text-xs text-muted-foreground">
            <span
                className={`font-medium ${value > previous ? 'text-success' : 'text-destructive'}`}
            >
                {change}
            </span>
            {from}
        </p>
    );
}

function Row({
    row,
    format,
}: {
    row: TableRow;
    format: (n: number) => string;
}) {
    const content = (
        <>
            <span
                className="grid size-9 shrink-0 place-items-center rounded-full border bg-muted text-sm font-medium"
                aria-hidden
            >
                {initials(row.title)}
            </span>
            <span className="grid min-w-0 flex-1 gap-1">
                <span className="truncate text-sm leading-none font-medium">
                    {row.title}
                </span>
                {row.subtitle && (
                    <span className="truncate text-sm text-muted-foreground">
                        {row.subtitle}
                    </span>
                )}
            </span>
            {row.value !== undefined && (
                <span className="font-medium tabular-nums">
                    {typeof row.value === 'number'
                        ? format(row.value)
                        : row.value}
                </span>
            )}
        </>
    );
    const rowClass = '-mx-2 flex items-center gap-4 rounded-md p-2';

    return row.link ? (
        <Link
            to={recordHref(row.link.resource, row.link.key)}
            className={`${rowClass} transition-colors hover:bg-accent`}
        >
            {content}
        </Link>
    ) : (
        <div className={rowClass}>{content}</div>
    );
}

function CardBody({
    metric,
    result,
}: {
    metric: MetricSchema;
    result: MetricResult;
}) {
    const format = (n: number) =>
        `${metric.prefix ?? ''}${number.format(n)}${metric.suffix ?? ''}`;

    if (result.type === 'value')
        return (
            <div className="space-y-1">
                <div className="text-2xl font-bold tabular-nums">
                    {format(result.value)}
                </div>
                <Change
                    value={result.value}
                    previous={result.previous}
                    comparedWith={result.comparedWith}
                    format={format}
                />
            </div>
        );

    if (result.type === 'table')
        return (
            <>
                {result.caption && (
                    <p className="-mt-3 text-sm text-muted-foreground">
                        {result.caption}
                    </p>
                )}
                {result.rows.length === 0 ? (
                    <NothingYet />
                ) : (
                    <ul className="grid gap-2">
                        {result.rows.map((row, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no key of their own, and never reorder in place
                            <li key={i}>
                                <Row row={row} format={format} />
                            </li>
                        ))}
                    </ul>
                )}
            </>
        );

    if (result.type === 'trend')
        return (
            <>
                <p className="-mt-3 text-sm text-muted-foreground">
                    {format(totalOf(result.points))} in all
                </p>
                <TrendChart
                    points={result.points}
                    format={format}
                    label={`${metric.label} over time`}
                    short={metric.width === '1/4'}
                    line={metric.chart === 'line'}
                />
            </>
        );

    if (result.slices.length === 0) return <NothingYet />;
    if (metric.chart === 'bar')
        return <ShareBars slices={result.slices} format={format} />;

    return (
        <PieChart
            slices={result.slices}
            format={format}
            label={`${metric.label} by share`}
        />
    );
}

const NothingYet = () => (
    <p className="text-sm text-muted-foreground">Nothing yet</p>
);
