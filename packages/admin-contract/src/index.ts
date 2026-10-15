/** How the admin panel shows and edits a value. */
export type FieldType =
    | 'id'
    | 'text'
    | 'textarea'
    | 'email'
    | 'password'
    | 'number'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'select'
    | 'json'
    /** The one record a foreign key points at; edited with a picker. */
    | 'belongsTo'
    /** The records whose foreign key points at this one; listed on the detail page. */
    | 'hasMany'
    /** Records linked through a join table; listed, attached and detached on the detail page. */
    | 'belongsToMany'
    /** An uploaded file: sent to its own upload endpoint first, then saved as the value that returns. */
    | 'file'
    /** Shown and edited by a component the panel registers under the field's `component`. */
    | 'custom';

/** The pages a field appears on. */
export interface FieldVisibility {
    index: boolean;
    detail: boolean;
    create: boolean;
    update: boolean;
}

export interface SelectOption {
    value: string | number;
    label: string;
}

/** What a form can check before it submits; the API checks again regardless. */
export interface FieldConstraints {
    integer?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
}

export interface FieldSchema {
    name: string;
    type: FieldType;
    label: string;
    help?: string;
    sortable: boolean;
    readonly: boolean;
    nullable: boolean;
    /** Must be given when creating: not nullable, and with no default. */
    required: boolean;
    visibility: FieldVisibility;
    options?: SelectOption[];
    constraints?: FieldConstraints;
    /**
     * For a relation field: the resource of the records it relates to, and for a hasMany, the
     * belongsTo field of those records that points back, to create one already pointing back.
     */
    relation?: { resource: string; inverse?: string };
    /** For a file field: the mime types it takes, e.g. `image/*`, and its largest size in bytes. */
    upload?: { accept: string[]; maxSize: number };
    /** For a custom field: the name the panel registers its component under. */
    component?: string;
}

/** A file field's value as records carry it: the stored value, and where to see the file. */
export interface FileValue {
    value: unknown;
    url: string | null;
    name?: string;
    /** Whether the panel can show it as an image. */
    image?: boolean;
}

/** `POST /admin/api/session`: signs in through the app's own login. */
export interface SessionInput {
    email: string;
    password: string;
}

/** The token the panel sends as a Bearer from then on. */
export interface SessionResponse {
    token: string;
}

/** What an upload stored: the value to save in the field, and the file as it will show. */
export interface UploadResponse {
    data: FileValue;
}

export type MetricType = 'value' | 'trend' | 'partition' | 'table';

/** How much of a row a card takes, as in Nova; a narrow screen gives each more. */
export type MetricWidth = '1/4' | '1/3' | '1/2' | '2/3' | '3/4' | 'full';

export interface MetricRange {
    /**
     * What the query string sends to pick it: days back from today such as `30`, `month`, `2025`
     * or `all`; the dashboard also takes days of its own, `2026-10-01..2026-10-09`, both included.
     */
    value: string;
    /** Short, as a button shows it: `30 days`, `This month`, `2025`, `All time`. */
    label: string;
}

/** How a trend is drawn: bars, or a line over a shaded area. */
export type TrendChart = 'bar' | 'line';

/** How a partition is drawn: a donut, or a bar a share. */
export type PartitionChart = 'pie' | 'bar';

/** A card on the dashboard or a resource's index: one number, a series over time, counts by group, or rows. */
export interface MetricSchema {
    name: string;
    label: string;
    type: MetricType;
    width: MetricWidth;
    /** Around the number, e.g. `€` or `%`. */
    prefix?: string;
    suffix?: string;
    /** The chart a trend or a partition is drawn as; none for a value or a table. */
    chart?: TrendChart | PartitionChart;
}

/** A value metric's number, and the one of the period before it, to compare with. */
export interface ValueResult {
    type: 'value';
    value: number;
    previous: number | null;
    /** The period previous covers, as in `+20% from last month`. */
    comparedWith?: string;
}

/** A trend metric's points, oldest first, one a period, e.g. a day or a month. */
export interface TrendResult {
    type: 'trend';
    points: { label: string; value: number }[];
}

/** A partition metric's groups, largest first. */
export interface PartitionResult {
    type: 'partition';
    slices: { label: string; value: number }[];
}

/** A row of a table metric, e.g. a recent sale: who, and for how much. */
export interface TableRow {
    title: string;
    subtitle?: string;
    /** On the right; a number gets the metric's prefix and suffix. */
    value?: string | number;
    /** The record it opens. */
    link?: { resource: string; key: RecordKey };
}

/** A table metric's rows, e.g. the latest sign-ups, with a line about them. */
export interface TableResult {
    type: 'table';
    rows: TableRow[];
    caption?: string;
}

export type MetricResult =
    | ValueResult
    | TrendResult
    | PartitionResult
    | TableResult;

/** The dashboard: its cards, and the ranges of the picker that covers them all. */
export interface DashboardSchema {
    label: string;
    ranges: MetricRange[];
    defaultRange: string | null;
    cards: MetricSchema[];
}

/** `GET /admin/api/dashboard?range=month`: every card, for the range picked. */
export interface DashboardResponse {
    /** The range, and the days it covers, both included; no first day for all time. */
    range: { value: string; label: string; from: string | null; to: string };
    /** In the order of the schema's cards; null for one that could not be calculated. */
    cards: { name: string; result: MetricResult | null }[];
}

export type FilterType = 'select' | 'boolean' | 'dateRange';

/**
 * A filter of a list, sent in the query string as `filter.<name>=<value>`; a date range as
 * `filter.<name>.from` and `filter.<name>.to`, each a date such as `2026-10-08`, both inclusive.
 */
export interface FilterSchema {
    name: string;
    label: string;
    type: FilterType;
    options?: SelectOption[];
}

/** Something to do to one or more records, asking for its fields first when it has any. */
export interface ActionSchema {
    name: string;
    label: string;
    /** Its run button red, as it destroys or cannot be undone. */
    destructive: boolean;
    /** Said on its page above the run button. */
    confirmText?: string;
    showOnIndex: boolean;
    showOnDetail: boolean;
    /** Runs on no records, picked among the index's actions with none selected, e.g. an import or a report. */
    standalone: boolean;
    fields: FieldSchema[];
}

export type SortDirection = 'asc' | 'desc';

export interface Sort {
    field: string;
    direction: SortDirection;
}

export interface ResourceSchema {
    /** Its segment in the API's and the panel's urls, e.g. `blog-posts`. */
    name: string;
    label: string;
    singularLabel: string;
    /** The field a record is named by in headings and links. */
    titleField: string;
    searchable: boolean;
    perPage: number;
    perPageOptions: number[];
    defaultSort: Sort;
    fields: FieldSchema[];
    filters: FilterSchema[];
    actions: ActionSchema[];
    /** Cards at the top of its index: `GET /admin/api/resources/:resource/cards?range=month` for them all. */
    metrics: MetricSchema[];
    /** The ranges of the picker that covers every card of its index, as the dashboard's. */
    ranges: MetricRange[];
    defaultRange: string | null;
    /**
     * Whether a delete only marks a record deleted, as its entity has a DeleteDateColumn: lists
     * leave such records out unless `?trashed=with` or `?trashed=only`, and they can be restored.
     */
    softDeletes: boolean;
    /** The column that dates a soft delete, which a deleted record's values hold. */
    deletedAtField: string | null;
    /** Whether changes to its records are kept in the activity log. */
    logsActivity: boolean;
}

export interface AdminSchema {
    resources: ResourceSchema[];
    /** None until a provider extends Dashboard. */
    dashboard: DashboardSchema | null;
}

export type RecordKey = string | number;

/** A record as a relation shows it: what to link to, and what to call it. */
export interface RelatedRecord {
    key: RecordKey;
    title: string;
}

export interface RecordData {
    key: RecordKey;
    title: string;
    /**
     * By field name; a password field is never among them, a belongsTo field holds a RelatedRecord or
     * null, and the records of a hasMany or belongsToMany field come from their own endpoint.
     */
    values: Record<string, unknown>;
}

export interface ListMeta {
    page: number;
    perPage: number;
    /** Null when the resource does not count its rows, as on a very large table. */
    total: number | null;
    lastPage: number | null;
    hasMore: boolean;
}

export interface ListResponse {
    data: RecordData[];
    meta: ListMeta;
}

export interface RecordResponse {
    data: RecordData;
}

/** The body of a create or update: values by field name. */
export type RecordInput = Record<string, unknown>;

/** What a belongsTo picker offers: `GET /admin/api/resources/:resource/options?search=ada`. */
export interface OptionsResponse {
    data: RelatedRecord[];
    hasMore: boolean;
}

export interface RelatedKeysResponse {
    count: number;
}

export type ActivityEvent =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'restored'
    | 'forceDeleted'
    | 'attached'
    | 'detached'
    | 'action';

/** One change to a record, as the activity log keeps it. */
export interface ActivityEntry {
    id: number;
    resource: string;
    recordKey: string;
    /** The record's title when the change was made. */
    recordTitle: string;
    event: ActivityEvent;
    /** The action's name, for an `action` event. */
    action: string | null;
    /**
     * By field name: `{ from, to }` for an update, the values for a create or delete, the titles
     * attached or detached, an action's values.
     */
    changes: Record<string, unknown>;
    /** Who made it, as the app named them then; null when it could not tell. */
    actor: ActivityActor | null;
    createdAt: string;
}

/** Who made a change: a record of the app, e.g. a user, linked to when it names its resource. */
export interface ActivityActor {
    key: RecordKey;
    title: string;
    resource?: string;
}

/** Who the panel is signed in as, as the app names them; null when it cannot tell. */
export interface MeResponse {
    user: ActivityActor | null;
}

export interface ActivityResponse {
    data: ActivityEntry[];
    meta: { page: number; hasMore: boolean };
}

export interface ActionResponse {
    message: string;
    /** A file the action made, for the browser to save. */
    download?: {
        filename: string;
        contentType: string;
        /** The file's bytes, base64 encoded. */
        base64: string;
    };
}

/** What `GET /admin/api/search?q=ada` finds: the records of each resource whose title matches, a few each. */
export interface SearchResponse {
    data: { resource: string; label: string; records: RelatedRecord[] }[];
}

export interface RestoreResponse {
    restored: number;
}

export interface DeleteResponse {
    deleted: number;
}

/** The body of a 422, with what is wrong with each field by its name. */
export interface ValidationErrorResponse {
    message: string;
    errors: Record<string, string[]>;
}
