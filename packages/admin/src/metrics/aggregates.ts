import {
    And,
    type FindOptionsOrder,
    type FindOptionsWhere,
    LessThan,
    MoreThanOrEqual,
    type ObjectLiteral,
    type Repository,
} from 'typeorm';
import { columnType } from '../registry/column-type.js';
import type {
    AggregateInput,
    GroupInput,
    LatestInput,
    NamedPeriod,
    RangeValue,
    Span,
    TrendInput,
    TrendUnit,
} from '../types/types.js';
import { DAY, dayStart, humanize } from '../utils.js';

const FUNCTIONS = { count: 'COUNT', sum: 'SUM', average: 'AVG' } as const;
// put in the SQL as they are, so only these
const UNITS = new Set<TrendUnit>(['day', 'week', 'month', 'year']);

/** The label of each named period. */
export const PERIODS: Record<NamedPeriod, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    year: 'This year',
    all: 'All time',
};

/** A calendar year, as a range names one. */
export const YEAR = /^(19|20)\d{2}$/;

/** Days of the dashboard's own picking, both included: `2026-10-01..2026-10-09`; of the years a YEAR takes. */
export const DAYS =
    /^((?:19|20)\d{2}-\d{2}-\d{2})\.\.((?:19|20)\d{2}-\d{2}-\d{2})$/;

const BEFORE: Partial<Record<NamedPeriod, string>> = {
    today: 'yesterday',
    week: 'last week',
    month: 'last month',
    year: 'last year',
};

// the start of the day, week (from Monday, as Postgres's date_trunc), month or year a moment falls in, in UTC
const startOf = (time: number, unit: TrendUnit): number => {
    const date = new Date(time);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    if (unit === 'year') return Date.UTC(year, 0, 1);
    if (unit === 'month') return Date.UTC(year, month, 1);

    const day = Date.UTC(year, month, date.getUTCDate());

    return unit === 'week' ? day - ((date.getUTCDay() + 6) % 7) * DAY : day;
};

// the start of the unit `count` after the one starting at `start`
const after = (start: number, unit: TrendUnit, count: number): number => {
    const date = new Date(start);

    if (unit === 'year') return Date.UTC(date.getUTCFullYear() + count, 0, 1);
    if (unit === 'month')
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1);

    return start + count * (unit === 'week' ? 7 : 1) * DAY;
};

const span = (from: number | null, to: number): Span => ({
    from: from === null ? null : new Date(from),
    to: new Date(to),
});

/**
 * What a range covers and the span before it, in UTC: `30` days up to today's end, `today`, `week`,
 * `month` or `year` to date, a year such as `'2025'`, days such as `'2026-10-01..2026-10-09'`, or `all`.
 */
export function period({
    range,
    now = Date.now(),
}: {
    range: RangeValue;
    /** When now is, for a test; the clock when unset. */
    now?: number;
}): {
    current: Span;
    previous: Span | null;
} {
    const end = startOf(now, 'day') + DAY;

    if (typeof range === 'number' && Number.isInteger(range) && range > 0)
        return {
            current: span(end - range * DAY, end),
            previous: span(end - 2 * range * DAY, end - range * DAY),
        };

    if (range === 'all') return { current: span(null, end), previous: null };

    const days = typeof range === 'string' ? DAYS.exec(range) : null;
    const first = dayStart(days?.[1]);
    const last = dayStart(days?.[2]);

    if (first !== undefined && last !== undefined && first <= last)
        return {
            current: span(first, last + DAY),
            previous: span(2 * first - last - DAY, first),
        };

    if (typeof range === 'string' && YEAR.test(range)) {
        const year = Number(range);

        return {
            current: span(Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1)),
            previous: span(Date.UTC(year - 1, 0, 1), Date.UTC(year, 0, 1)),
        };
    }

    if (
        range === 'today' ||
        range === 'week' ||
        range === 'month' ||
        range === 'year'
    ) {
        const unit = range === 'today' ? 'day' : range;
        const from = startOf(now, unit);
        const before = after(from, unit, -1);

        return {
            current: span(from, end),
            // as far into the unit before as this one has gone by now, e.g. Sep 1 to 10, 3pm, on Oct 10 at 3pm
            previous: span(before, Math.min(before + (now - from), from)),
        };
    }

    throw new Error(
        `No period "${range}": a range is a number of days, today, week, month, year, all, a year such as '2025' or days such as '2026-10-01..2026-10-09'`,
    );
}

/** What a range is compared with, as in `+20% from last month`; nothing for all time. */
export function comparedWith(range: RangeValue): string | undefined {
    if (typeof range === 'number')
        return range === 1 ? 'yesterday' : `the ${range} days before`;
    if (Object.hasOwn(BEFORE, range)) return BEFORE[range as NamedPeriod];
    if (YEAR.test(range)) return String(Number(range) - 1);
    if (DAYS.test(range)) return 'the days before';

    return undefined;
}

/** A trend's unit when it names none: as many points as read well, a day to a year each. */
export const unitFor = (days: number): TrendUnit =>
    days <= 31 ? 'day' : days <= 183 ? 'week' : days <= 731 ? 'month' : 'year';

const columnName = (
    repository: Repository<ObjectLiteral>,
    property: string,
) => {
    // a dashboard metric gets no repository of a resource, and has to take one from the data source
    if (!repository)
        throw new Error(
            'A metric aggregated without a repository: on the dashboard, pass dataSource.getRepository(Entity)',
        );

    const column = repository.metadata.findColumnWithPropertyName(property);

    if (!column)
        throw new Error(
            `${repository.metadata.name} has no column "${property}" to aggregate`,
        );

    return column.databaseName;
};

// the rows of a span, with what is aggregated of them
function rowsOf({
    repository,
    column = 'createdAt',
    fn = 'count',
    of,
    from,
    to,
}: AggregateInput & Span) {
    const date = columnName(repository, column);
    const target =
        fn === 'count'
            ? '*'
            : `"row"."${columnName(repository, of ?? column)}"`;
    const query = repository
        .createQueryBuilder('row')
        .select(`${FUNCTIONS[fn]}(${target})`, 'value')
        .where(`"row"."${date}" < :to`, { to });

    if (from) query.andWhere(`"row"."${date}" >= :from`, { from });

    return { query, date };
}

async function aggregateOver(input: AggregateInput & Span): Promise<number> {
    const row = await rowsOf(input).query.getRawOne<{
        value: string | null;
    }>();

    return Number(row?.value ?? 0);
}

/**
 * The count, sum or average of the rows whose date column falls in the range, and of the span
 * before it, for a Value; no previous for `all`.
 */
export async function aggregate(
    input: AggregateInput,
): Promise<{ value: number; previous: number | null }> {
    const { current, previous } = period({ range: input.range });

    const [value, before] = await Promise.all([
        aggregateOver({ ...input, ...current }),
        previous ? aggregateOver({ ...input, ...previous }) : null,
    ]);

    return { value, previous: before };
}

/**
 * The count, sum or average of the rows of each unit of the range, oldest first, for a Trend; without
 * a unit, unitFor() picks one. Labelled `2026-10-09` (a week by its Monday), `2026-10` or `2026`.
 */
export async function byPeriod({
    unit,
    ...input
}: TrendInput): Promise<{ points: { label: string; value: number }[] }> {
    const { current } = period({ range: input.range });
    const property = input.column ?? 'createdAt';
    const date = columnName(input.repository, property);
    const dated =
        input.repository.metadata.findColumnWithPropertyName(property);
    // a timestamptz is moved to UTC before it is cut into days; a plain timestamp is in it already
    const utc =
        dated &&
        ['timestamptz', 'timestamp with time zone'].includes(columnType(dated))
            ? ` AT TIME ZONE 'UTC'`
            : '';
    const start =
        current.from?.getTime() ??
        (await firstOf({ ...input, date, ...current }));

    if (start === undefined) return { points: [] };

    const by = unit ?? unitFor((current.to.getTime() - start) / DAY);

    if (!UNITS.has(by))
        throw new Error(
            `No unit "${by}": a trend is by day, week, month or year`,
        );

    // from the start of the first unit, so its bar counts the whole of it, as the others do
    const rows = await rowsOf({
        ...input,
        from: new Date(startOf(start, by)),
        to: current.to,
    })
        .query.addSelect(
            `to_char(date_trunc('${by}', "row"."${date}"${utc}), 'YYYY-MM-DD')`,
            'start',
        )
        .groupBy('start')
        .getRawMany<{ start: string; value: string }>();
    const values = new Map(rows.map((row) => [row.start, Number(row.value)]));
    const points: { label: string; value: number }[] = [];
    const length = by === 'year' ? 4 : by === 'month' ? 7 : 10;

    for (
        let time = startOf(start, by);
        time < current.to.getTime();
        time = after(time, by, 1)
    ) {
        const key = new Date(time).toISOString().slice(0, 10);

        points.push({
            label: key.slice(0, length),
            value: values.get(key) ?? 0,
        });
    }

    return { points };
}

// when the first row before the span's end is dated, or undefined without one
async function firstOf({
    repository,
    date,
    to,
}: AggregateInput & Span & { date: string }): Promise<number | undefined> {
    const row = await repository
        .createQueryBuilder('row')
        .select(`MIN("row"."${date}")`, 'first')
        .where(`"row"."${date}" < :to`, { to })
        .getRawOne<{ first: Date | string | null }>();

    return row?.first ? new Date(row.first).getTime() : undefined;
}

/** The newest rows whose date column falls in the range, newest first, e.g. for a Table. */
export async function latest<TEntity extends ObjectLiteral>({
    repository,
    range,
    column = 'createdAt',
    limit = 5,
    relations,
}: LatestInput<TEntity>): Promise<TEntity[]> {
    const { from, to } = period({ range }).current;

    columnName(repository, column);

    return repository.find({
        where: {
            [column]: from
                ? And(MoreThanOrEqual(from), LessThan(to))
                : LessThan(to),
        } as FindOptionsWhere<TEntity>,
        order: { [column]: 'DESC' } as FindOptionsOrder<TEntity>,
        take: limit,
        relations,
    });
}

/** How many rows hold each value of a column, largest first, for a Partition; of a range's rows when given and the entity dates them by createdAt. */
export async function countBy({
    repository,
    column,
    labels = {},
    range,
}: GroupInput): Promise<{ slices: { label: string; value: number }[] }> {
    const name = columnName(repository, column);
    const { query } =
        range && repository.metadata.findColumnWithPropertyName('createdAt')
            ? rowsOf({ repository, range, ...period({ range }).current })
            : { query: repository.createQueryBuilder('row') };
    const rows = await query
        .select(`"row"."${name}"`, 'group')
        .addSelect('COUNT(*)', 'value')
        .groupBy(`"row"."${name}"`)
        .orderBy('value', 'DESC')
        .getRawMany<{ group: unknown; value: string }>();

    return {
        slices: rows.map(({ group, value }) => ({
            label:
                group === null
                    ? '(none)'
                    : (labels[String(group)] ?? humanize(String(group))),
            value: Number(value),
        })),
    };
}
