import type { FilterSchema, SelectOption } from '@repo/admin-contract';
import { Link } from 'react-router';
import { withQuery } from '@/lib/navigation';
import { DateRangeForm } from './DateRangeForm';
import { CheckIcon, PlusCircleIcon, XIcon } from './icons';

export const filterParams = ({ name, type }: FilterSchema) =>
    type === 'dateRange'
        ? [`filter.${name}.from`, `filter.${name}.to`]
        : [`filter.${name}`];

const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
});
const show = (date: string) => day.format(new Date(`${date}T00:00:00Z`));

function Facet({
    label,
    current,
    children,
}: {
    label: string;
    current?: string;
    children: React.ReactNode;
}) {
    return (
        // a new value remounts it, closing the popover
        <details key={current ?? ''} className="relative">
            <summary className="btn btn-outline btn-sm border-dashed">
                <PlusCircleIcon />
                {label}
                {current && (
                    <>
                        <span className="mx-0.5 h-4 w-px bg-border" />
                        <span className="rounded-sm bg-secondary px-1.5 text-xs font-normal">
                            {current}
                        </span>
                    </>
                )}
            </summary>
            <div className="popover left-0 w-56">{children}</div>
        </details>
    );
}

function Options({
    param,
    options,
    query,
}: {
    param: string;
    options: SelectOption[];
    query: Record<string, string | undefined>;
}) {
    const picked = query[param];

    return (
        <div className="grid max-h-72 gap-0.5 overflow-y-auto">
            {options.map(({ value, label }) => {
                const on = String(value) === picked;

                return (
                    <Link
                        key={String(value)}
                        to={withQuery(query, {
                            [param]: on ? undefined : String(value),
                            page: undefined,
                        })}
                        className="menu-item"
                        aria-current={on || undefined}
                    >
                        <span
                            className={`grid size-4 place-items-center rounded-sm border [&_svg]:size-3 ${on ? 'border-primary bg-primary text-primary-foreground' : ''}`}
                        >
                            {on && <CheckIcon />}
                        </span>
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}

const BOOLEAN: SelectOption[] = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
];

const TRASHED: SelectOption[] = [
    { value: 'with', label: 'Shown too' },
    { value: 'only', label: 'Only these' },
];

export function Filters({
    filters,
    query,
    softDeletes,
}: {
    filters: FilterSchema[];
    query: Record<string, string | undefined>;
    softDeletes: boolean;
}) {
    const active = [
        ...filters.filter((filter) =>
            filterParams(filter).some((param) => query[param]),
        ),
        ...(softDeletes && query.trashed ? ['trashed'] : []),
    ];

    return (
        <>
            {filters.map((filter) => {
                const [param = '', toParam = ''] = filterParams(filter);

                if (filter.type !== 'dateRange') {
                    const options =
                        filter.type === 'boolean'
                            ? BOOLEAN
                            : (filter.options ?? []);

                    return (
                        <Facet
                            key={filter.name}
                            label={filter.label}
                            current={
                                options.find(
                                    ({ value }) =>
                                        String(value) === query[param],
                                )?.label
                            }
                        >
                            <Options
                                param={param}
                                options={options}
                                query={query}
                            />
                        </Facet>
                    );
                }

                const from = query[param];
                const to = query[toParam];

                return (
                    <Facet
                        key={filter.name}
                        label={filter.label}
                        current={
                            from || to
                                ? `${from ? show(from) : '…'} – ${to ? show(to) : '…'}`
                                : undefined
                        }
                    >
                        {/* two dates do not apply on a click, so these wait for Apply */}
                        <DateRangeForm
                            kept={Object.entries(query).filter(
                                (entry): entry is [string, string] =>
                                    entry[1] !== undefined &&
                                    ![param, toParam, 'page'].includes(
                                        entry[0],
                                    ),
                            )}
                            from={from}
                            to={to}
                            fromName={param}
                            toName={toParam}
                            className="grid gap-2 p-2"
                        />
                    </Facet>
                );
            })}

            {softDeletes && (
                <Facet
                    label="Deleted"
                    current={
                        TRASHED.find(({ value }) => value === query.trashed)
                            ?.label
                    }
                >
                    <Options param="trashed" options={TRASHED} query={query} />
                </Facet>
            )}

            {active.length > 0 && (
                <Link
                    to={withQuery(
                        query,
                        Object.fromEntries(
                            [
                                ...filters.flatMap(filterParams),
                                'trashed',
                                'page',
                            ].map((param) => [param, undefined]),
                        ),
                    )}
                    className="btn btn-ghost btn-sm"
                >
                    Reset
                    <XIcon />
                </Link>
            )}
        </>
    );
}
