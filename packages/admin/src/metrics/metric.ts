import type {
    MetricType,
    MetricWidth,
    PartitionChart,
    PartitionResult,
    TableResult,
    TrendChart,
    TrendResult,
    ValueResult,
} from '@repo/admin-contract';
import type {
    AggregateInput,
    MetricInput,
    MetricOptions,
    PartitionOptions,
    RangeOption,
    RangeValue,
    TotalOptions,
    TrendOptions,
    TrendUnit,
} from '../types/types.js';
import { aggregate, byPeriod, countBy } from './aggregates.js';

/**
 * A card of the dashboard or of a resource's index, which `calculate()` fills for the range the
 * page picks. Value, Trend and Partition count their entity's rows themselves, configured with
 * options: `new Value({ entity: UserEntity, label: 'Sign ups' })`; a subclass calculates its own.
 */
export abstract class Metric<TEntity extends object = object> {
    /** Its key; the label in kebab case, or the class name without Metric, when unset. */
    name?: string;
    label?: string;
    /** Around the number, e.g. `€` or `%`. */
    prefix?: string;
    suffix?: string;
    /** How much of a row it takes. */
    width: MetricWidth;
    /** Whose rows it counts; its resource's on a resource's index when unset. */
    entity?: new (
        ...args: never[]
    ) => TEntity;

    abstract readonly type: MetricType;

    constructor({ width = '1/2', ...options }: MetricOptions<TEntity> = {}) {
        Object.assign(this, options);
        this.width = width;
    }

    abstract calculate(input: MetricInput<TEntity>): Promise<object>;
}

/** One number, compared with the period before it: the rows created in the range, or a sum or average. */
export class Value<TEntity extends object = object> extends Metric<TEntity> {
    readonly type = 'value';
    private readonly total: TotalOptions;

    constructor({
        fn,
        of,
        column,
        ...options
    }: TotalOptions & MetricOptions<TEntity> = {}) {
        super({ width: '1/4', ...options });
        this.total = { fn, of, column } as TotalOptions;
    }

    async calculate({
        range,
        repository,
    }: MetricInput<TEntity>): Promise<Omit<ValueResult, 'type'>> {
        return aggregate({
            ...this.total,
            repository,
            range,
        } as AggregateInput);
    }
}

/** A number a day, week, month or year over the range, e.g. sign-ups a day. */
export class Trend<TEntity extends object = object> extends Metric<TEntity> {
    readonly type = 'trend';
    /** Bars, or a line over a shaded area. */
    chart: TrendChart;
    private readonly total: TotalOptions & { unit?: TrendUnit };

    constructor({
        fn,
        of,
        column,
        unit,
        chart = 'bar',
        ...options
    }: TrendOptions & MetricOptions<TEntity> = {}) {
        super(options);
        this.chart = chart;
        this.total = { fn, of, column, unit } as TotalOptions;
    }

    async calculate({
        range,
        repository,
    }: MetricInput<TEntity>): Promise<Omit<TrendResult, 'type'>> {
        return byPeriod({ ...this.total, repository, range } as AggregateInput);
    }
}

/** The rows of the range by the value of a column, e.g. posts by status; all of them when its entity has no createdAt. */
export class Partition<
    TEntity extends object = object,
> extends Metric<TEntity> {
    readonly type = 'partition';
    /** A donut, or a bar a share. */
    chart: PartitionChart;
    /** The column it groups by; a subclass that calculates its own needs none. */
    readonly column?: string;
    private readonly labels?: Record<string, string>;

    constructor({
        column,
        labels,
        chart = 'pie',
        ...options
    }: PartitionOptions & MetricOptions<TEntity> = {}) {
        super(options);
        this.chart = chart;
        this.column = column;
        this.labels = labels;
    }

    async calculate({
        range,
        repository,
    }: MetricInput<TEntity>): Promise<Omit<PartitionResult, 'type'>> {
        return countBy({
            repository,
            column: String(this.column),
            labels: this.labels,
            range,
        });
    }
}

/** Rows to read at a glance, e.g. the latest sign-ups or sales, as `latest()` finds them; each may link to its record. */
export abstract class Table<
    TEntity extends object = object,
> extends Metric<TEntity> {
    readonly type = 'table';

    abstract override calculate(
        input: MetricInput<TEntity>,
    ): Promise<Omit<TableResult, 'type'>>;
}

/** The dashboard, extended once in any module's providers: its cards, all for the range its picker sets. */
export abstract class Dashboard {
    label = 'Dashboard';
    ranges: RangeOption[] = ['today', 'week', 'month', 'year', 'all'];
    /** One of its ranges, picked when the page opens; this month, else 30 days, else the first. */
    defaultRange?: RangeValue;

    abstract cards(): Metric[];
}
