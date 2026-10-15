import type {
    ActionSchema,
    DashboardSchema,
    FieldSchema,
    FilterSchema,
    MetricSchema,
    MetricWidth,
    PartitionChart,
    RecordKey,
    ResourceSchema,
    TrendChart,
} from '@repo/admin-contract';
import type {
    DataSource,
    EntityMetadata,
    FindOptionsRelations,
    ObjectLiteral,
    Repository,
} from 'typeorm';
import type { Action } from '../actions/action.js';
import type { Field } from '../fields/field.js';
import type { AnyFilter } from '../filters/filter.js';
import type { Metric } from '../metrics/metric.js';
import type { Resource } from '../resources/resource.js';

/** TypeORM's column metadata, which its package entry does not export. */
export type ColumnMetadata = EntityMetadata['columns'][number];

/** TypeORM's relation metadata, which its package entry does not export either. */
export type RelationMetadata = EntityMetadata['relations'][number];

/** A query string, as Nest parses it. */
export type Query = Record<string, unknown>;

export interface FilterInput<TValue> {
    value: TValue;
}

/** A resource class, as a relation field names the one its records are listed by. */
export type ResourceClass = abstract new (...args: never[]) => Resource;

/** What is wrong with a value, or undefined when nothing is. */
export type FieldRule = (value: unknown) => string | undefined;

/** The value of a computed field, from the whole record. */
export type FieldResolver<TEntity = object> = (record: TEntity) => unknown;

/** What a field's column says of what its resource left unset. */
export interface ColumnDefaults {
    nullable?: boolean;
    required?: boolean;
    maxLength?: number;
    /** A generated or timestamp column, which no form writes. */
    offForms?: boolean;
    /** An enum column's values. */
    options?: (string | number)[];
}

/** A file as uploaded to a file field. */
export interface UploadedFile {
    buffer: Buffer;
    name: string;
    mimeType: string;
    size: number;
}

/** Stores an upload, resolving with the value the file field's column keeps. */
export type FileStore = (input: { file: UploadedFile }) => Promise<unknown>;

/** Where the file a file field's value names is seen, or null. */
export type FileUrl = (value: unknown, record?: object) => string | null;

export interface ActionHandleInput<TEntity extends object> {
    records: TEntity[];
    /** By field name, checked and converted as a create's are. */
    values: Record<string, unknown>;
    repository: Repository<TEntity>;
}

export interface ActionResult {
    message?: string;
    /** A file for the browser to save, e.g. a report. */
    download?: {
        filename: string;
        contentType: string;
        content: string | Buffer;
    };
}

export interface CreateInput<TEntity extends object> {
    values: Partial<TEntity>;
    repository: Repository<TEntity>;
}

export interface UpdateInput<TEntity extends object>
    extends CreateInput<TEntity> {
    record: TEntity;
}

export interface DeleteRecordsInput<TEntity extends object> {
    keys: RecordKey[];
    /** The entities of these keys, as repository.remove(), softRemove() and recover() take them, which fire its subscribers. */
    records: TEntity[];
    repository: Repository<TEntity>;
}

/** A field together with the column it reads and writes, which a computed field has none of. */
export interface ResolvedField {
    field: Field;
    column?: ColumnMetadata;
    schema: FieldSchema;
    relation?: RelationMetadata;
    /** The name of the resource a relation field's records belong to. */
    target?: string;
}

export interface ResolvedFilter {
    filter: AnyFilter;
    schema: FilterSchema;
}

export interface ResolvedMetric {
    metric: Metric;
    schema: MetricSchema;
    /** Of its entity, or of its resource's; none for a dashboard card without an entity. */
    repository?: Repository<object>;
}

export interface ResolvedAction {
    action: Action;
    fields: ResolvedField[];
    schema: ActionSchema;
}

/** The cards of the dashboard or of a resource's index, and the ranges of the picker over them. */
export interface ResolvedCards {
    metrics: ResolvedMetric[];
    /** Each range as declared, by its value in the query string. */
    ranges: Map<string, RangeValue>;
    schema: Pick<DashboardSchema, 'ranges' | 'defaultRange'>;
}

export interface ResolvedDashboard extends ResolvedCards {
    schema: DashboardSchema;
}

/** A resource with everything its entity's metadata says about it, ready to serve. */
export interface ResolvedResource extends ResolvedCards {
    resource: Resource;
    metadata: EntityMetadata;
    repository: Repository<object>;
    primaryColumn: ColumnMetadata;
    fields: ResolvedField[];
    filters: ResolvedFilter[];
    actions: ResolvedAction[];
    searchColumns: string[];
    schema: ResourceSchema;
}

/** A period named rather than counted in days: today, this calendar week, month or year to date, or all time. */
export type NamedPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

/** A range as a metric's `ranges` declare it, and as its calculate() gets it back. */
export type RangeValue = number | string;

/**
 * A range a metric offers: days back from now, a named period, a calendar year such as `'2025'`,
 * or any of these, or a value of its own, under a label of its own.
 */
export type RangeOption =
    | number
    | NamedPeriod
    | `${number}`
    | { value: RangeValue; label: string };

/** What a range covers, from inclusive to exclusive in UTC; no start for all time. */
export interface Span {
    from: Date | null;
    to: Date;
}

export type TrendUnit = 'day' | 'week' | 'month' | 'year';

export interface MetricInput<TEntity extends object = object> {
    /** The range the page picked. */
    range: RangeValue;
    dataSource: DataSource;
    /** Of the metric's `entity`, or of its resource's; on the dashboard, a card without an entity has none. */
    repository: Repository<TEntity>;
}

/** How a card is shown, and whose rows it counts. */
export interface MetricOptions<TEntity extends object = object> {
    name?: string;
    label?: string;
    prefix?: string;
    suffix?: string;
    width?: MetricWidth;
    entity?: new (...args: never[]) => TEntity;
}

/** What a Value or Trend totals: the rows, or a column summed or averaged, dated by a column. */
export type TotalOptions = {
    /** The date column the range applies to; createdAt when unset. */
    column?: string;
} & (
    | { fn?: 'count'; of?: never }
    /** A sum or average needs the column it sums or averages. */
    | { fn: 'sum' | 'average'; of: string }
);

export type TrendOptions = TotalOptions & {
    /** A day, week, month or year a point; the one that suits the range when unset. */
    unit?: TrendUnit;
    chart?: TrendChart;
};

export interface PartitionOptions {
    /** The column whose values it counts the rows of. */
    column?: string;
    /** A label for a value; the value itself, humanized, when unset. */
    labels?: Record<string, string>;
    chart?: PartitionChart;
}

export type AggregateInput = {
    repository: Repository<ObjectLiteral>;
    /** Days back from now, a named period or a year, as period() reads it. */
    range: RangeValue;
} & TotalOptions;

/** An aggregate a period at a time: a day, a week from Monday, a month or a year, in UTC. */
export type TrendInput = AggregateInput & { unit?: TrendUnit };

export interface LatestInput<TEntity extends ObjectLiteral> {
    repository: Repository<TEntity>;
    range: RangeValue;
    /** The date column the range applies to and the rows are ordered by; createdAt when unset. */
    column?: string;
    /** 5 when unset. */
    limit?: number;
    /** Relations to load with each row, e.g. `{ author: true }`. */
    relations?: FindOptionsRelations<TEntity>;
}

export interface GroupInput {
    repository: Repository<ObjectLiteral>;
    column: string;
    /** A label for each value, e.g. the options of a select field. */
    labels?: Record<string, string>;
    /** Only the rows whose createdAt falls in it, as aggregate() reads it; all of them when unset. */
    range?: RangeValue;
}
