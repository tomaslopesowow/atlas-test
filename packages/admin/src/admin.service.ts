import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type {
    ActionResponse,
    ActivityActor,
    ActivityEvent,
    ActivityResponse,
    AdminSchema,
    DashboardResponse,
    DeleteResponse,
    FieldSchema,
    FileValue,
    ListResponse,
    MetricResult,
    OptionsResponse,
    RecordData,
    RecordInput,
    RecordKey,
    RecordResponse,
    RelatedKeysResponse,
    RelatedRecord,
    RestoreResponse,
    SearchResponse,
    UploadResponse,
} from '@repo/admin-contract';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
    DataSource,
    type FindOptionsRelations,
    type FindOptionsWhere,
    In,
    IsNull,
    Not,
    QueryFailedError,
    type Repository,
} from 'typeorm';
import { ActivityLog } from './activity/activity-log.js';
import type { Field } from './fields/field.js';
import { comparedWith, DAYS, PERIODS, period } from './metrics/aggregates.js';
import {
    containing,
    filterConditions,
    listWhere,
    pageOf,
    paging,
    text,
} from './queries/list-query.js';
import { columnType, isText } from './registry/column-type.js';
import { ResourceRegistry } from './registry/resource-registry.js';
import type {
    Query,
    RangeValue,
    ResolvedCards,
    ResolvedField,
    ResolvedMetric,
    ResolvedResource,
    UploadedFile,
} from './types/types.js';
import { DAY, humanize } from './utils.js';
import { checkValues } from './values/check-values.js';

/** Who made a write, for the activity log; null when the app cannot tell. */
type Actor = ActivityActor | null;

// the largest key each integer column holds, past which no record has it
const INT_MAX: Record<string, bigint> = {
    smallint: 32_767n,
    int2: 32_767n,
    int: 2_147_483_647n,
    int4: 2_147_483_647n,
    integer: 2_147_483_647n,
    bigint: 9_223_372_036_854_775_807n,
    int8: 9_223_372_036_854_775_807n,
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KEYS = 1_000;
const OPTIONS_PAGE = 20;
const SEARCH_PER_RESOURCE = 5;
const IMAGE = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

// a password is never kept, only that it was written
const PASSWORD_CHANGED = '(changed)';

/** Whether a mime type is one a file field takes: `image/*` takes any image. */
const accepts = (pattern: string, mimeType: string) => {
    const type = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';

    return pattern.endsWith('/*')
        ? type.startsWith(pattern.slice(0, -1).toLowerCase())
        : type === pattern.toLowerCase();
};

/** What changed between two serializations of a record, by field. */
const changesBetween = (
    before: Record<string, unknown>,
    after: Record<string, unknown>,
) =>
    Object.fromEntries(
        Object.keys(after)
            .filter(
                (name) =>
                    JSON.stringify(before[name]) !==
                    JSON.stringify(after[name]),
            )
            .map((name) => [
                name,
                { from: before[name] ?? null, to: after[name] ?? null },
            ]),
    );

/** The password fields among values written, which the log names but never holds. */
const passwordsIn = (
    fields: { field: Field; schema: FieldSchema }[],
    values: Record<string, unknown>,
) =>
    Object.fromEntries(
        fields
            .filter(
                ({ field, schema }) =>
                    schema.type === 'password' &&
                    values[field.name] !== undefined,
            )
            .map(({ field }) => [field.name, PASSWORD_CHANGED]),
    );

const megabytes = (bytes: number) =>
    `${Math.round((bytes / 1_048_576) * 10) / 10} MB`;

// days the dashboard's picker sets, such as 2026-10-01..2026-10-09, that a calendar has
const isDays = (value: string) => {
    if (!DAYS.test(value)) return false;

    try {
        period({ range: value });
        return true;
    } catch {
        return false;
    }
};

const postgresError = (error: unknown) =>
    error instanceof QueryFailedError
        ? (error.driverError as {
              code?: string;
              message?: string;
              detail?: string;
              column?: string;
          })
        : undefined;

// a stored name with a stray %, such as `100%.png`, is shown as it is rather than failing the list
const decoded = (name: string) => {
    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
};

const invalid = (
    errors: Record<string, string[]>,
    message = 'Some values are not valid',
) => new UnprocessableEntityException({ message, errors });

const body = (input: unknown): RecordInput => {
    if (typeof input !== 'object' || input === null || Array.isArray(input))
        throw new BadRequestException('Send the values as a JSON object');

    return input as RecordInput;
};

const fieldNamed = (
    resolved: ResolvedResource,
    name: string,
    types?: FieldSchema['type'][],
) =>
    resolved.fields.find(
        ({ field, schema }) =>
            field.name === name && (!types || types.includes(schema.type)),
    );

const byKeys = (resolved: ResolvedResource, keys: RecordKey[]) => ({
    [resolved.primaryColumn.propertyName]: In(keys),
});

const keyOf = (resolved: ResolvedResource, record: object) =>
    (record as Record<string, unknown>)[
        resolved.primaryColumn.propertyName
    ] as RecordKey;

// a record as a relation shows it
const related = (resolved: ResolvedResource, record: object): RelatedRecord => {
    const key = keyOf(resolved, record);

    return {
        key,
        title: String(
            (record as Record<string, unknown>)[resolved.schema.titleField] ??
                key,
        ),
    };
};

// the records belongsTo fields point at, which a record shows the title of
const relationsToLoad = (
    resolved: ResolvedResource,
): FindOptionsRelations<object> =>
    Object.fromEntries(
        resolved.fields
            .filter(({ schema }) => schema.type === 'belongsTo')
            .map(({ field }) => [field.name, true]),
    );

// a file field's value with where to see it, its name, and whether it is an image
const fileValue = (
    field: Field,
    value: unknown,
    record?: object,
): FileValue => {
    if (value === null || value === undefined)
        return { value: null, url: null };

    const url = field.urlResolver
        ? field.urlResolver(value, record)
        : typeof value === 'string'
          ? value
          : null;
    const path =
        (url ?? (typeof value === 'string' ? value : '')).split('?')[0] ?? '';
    const name = decoded(path.split('/').pop() ?? '') || undefined;

    return { value, url, ...(name && { name }), image: IMAGE.test(path) };
};

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly registry: ResourceRegistry,

        @InjectDataSource()
        private readonly dataSource: DataSource,

        private readonly activityLog: ActivityLog,
    ) {}

    /** Every resource, with its fields, filters and actions, as the panel builds its pages from them. */
    schema(): AdminSchema {
        return {
            resources: this.registry.all().map(({ schema }) => schema),
            dashboard: this.registry.dashboard()?.schema ?? null,
        };
    }

    /** A page of the resource's records, filtered, searched and sorted as the query string asks. */
    async list({
        resource,
        query,
    }: {
        resource: string;
        query: Query;
    }): Promise<ListResponse> {
        return this.listOf({
            resolved: this.registry.get({ resource }),
            query,
        });
    }

    async show({
        resource,
        key,
    }: {
        resource: string;
        key: string;
    }): Promise<RecordResponse> {
        const resolved = this.registry.get({ resource });

        return {
            data: await this.serialize({
                resolved,
                record: await this.findRecord({ resolved, key }),
            }),
        };
    }

    async create({
        resource,
        input,
        actor,
    }: {
        resource: string;
        input: unknown;
        actor: Actor;
    }): Promise<RecordResponse> {
        const resolved = this.registry.get({ resource });
        const values = await this.validate({
            resolved,
            input: body(input),
            creating: true,
        });
        const saved = await this.write({
            resolved,
            run: () =>
                resolved.resource.create({
                    values,
                    repository: resolved.repository,
                }),
        });
        const created = await this.show({
            resource,
            key: String(keyOf(resolved, saved)),
        });

        await this.log({
            resolved,
            actor,
            event: 'created',
            changed: [
                {
                    record: created.data,
                    changes: {
                        ...created.data.values,
                        ...passwordsIn(resolved.fields, values),
                    },
                },
            ],
        });

        return created;
    }

    async update({
        resource,
        key,
        input,
        actor,
    }: {
        resource: string;
        key: string;
        input: unknown;
        actor: Actor;
    }): Promise<RecordResponse> {
        const resolved = this.registry.get({ resource });
        const existing = await this.findRecord({ resolved, key });
        const values = await this.validate({
            resolved,
            input: body(input),
            creating: false,
        });
        const before = await this.serialize({ resolved, record: existing });

        await this.write({
            resolved,
            run: () =>
                resolved.resource.update({
                    record: existing,
                    values,
                    repository: resolved.repository,
                }),
        });

        const updated = await this.show({ resource, key });
        const changes = {
            ...changesBetween(before.values, updated.data.values),
            ...passwordsIn(resolved.fields, values),
        };

        if (Object.keys(changes).length)
            await this.log({
                resolved,
                actor,
                event: 'updated',
                changed: [{ record: updated.data, changes }],
            });

        return updated;
    }

    /** Deletes records: marks them deleted when the resource soft-deletes, unless forced. */
    async delete({
        resource,
        keys,
        force,
        actor,
    }: {
        resource: string;
        keys: unknown;
        force: unknown;
        actor: Actor;
    }): Promise<DeleteResponse> {
        const resolved = this.registry.get({ resource });
        // for good, past a soft delete; a resource without them always deletes for good
        const hard = force === true && resolved.schema.softDeletes;
        const { entities, records } = await this.loadKeys({
            resolved,
            keys,
            withDeleted: hard,
        });

        if (records.length === 0) return { deleted: 0 };

        const input = {
            keys: records.map(({ key }) => key),
            records: entities,
            repository: resolved.repository,
        };
        const deleted = await this.write({
            resolved,
            run: () =>
                hard
                    ? resolved.resource.forceDelete(input)
                    : resolved.resource.delete(input),
        });

        await this.log({
            resolved,
            actor,
            event: hard ? 'forceDeleted' : 'deleted',
            changed: records.map((record) => ({
                record,
                changes: record.values,
            })),
        });

        return { deleted };
    }

    /** Brings soft-deleted records back. */
    async restore({
        resource,
        keys,
        actor,
    }: {
        resource: string;
        keys: unknown;
        actor: Actor;
    }): Promise<RestoreResponse> {
        const resolved = this.registry.get({ resource });
        const { softDeletes, deletedAtField, label } = resolved.schema;

        if (!softDeletes || !deletedAtField)
            throw new BadRequestException(
                `${label} are not soft-deleted, so none can be restored`,
            );

        // a record that is not deleted has nothing to restore, and no restore to log
        const { entities, records } = await this.loadKeys({
            resolved,
            keys,
            withDeleted: true,
            where: { [deletedAtField]: Not(IsNull()) },
        });

        if (records.length === 0) return { restored: 0 };

        const restored = await this.write({
            resolved,
            run: () =>
                resolved.resource.restore({
                    keys: records.map(({ key }) => key),
                    records: entities,
                    repository: resolved.repository,
                }),
        });

        await this.log({
            resolved,
            actor,
            event: 'restored',
            changed: records.map((record) => ({ record, changes: {} })),
        });

        return { restored };
    }

    /** A page of a record's history, newest first; also of one deleted for good. */
    async recordActivity({
        resource,
        key,
        page,
    }: {
        resource: string;
        key: string;
        page: unknown;
    }): Promise<ActivityResponse> {
        const resolved = this.registry.get({ resource });

        return this.activityLog.list({
            resource: resolved.schema.name,
            recordKey: this.parseKey({ resolved, key }),
            page: pageOf(page),
        });
    }

    /** A page of everything changed through the panel, or through one resource, newest first. */
    async activity({
        resource,
        page,
    }: {
        resource: unknown;
        page: unknown;
    }): Promise<ActivityResponse> {
        return this.activityLog.list({
            ...(typeof resource === 'string' &&
                resource && {
                    resource: this.registry.get({ resource }).schema.name,
                }),
            page: pageOf(page),
        });
    }

    /** Records to pick from for a belongsTo field, by their title, searched by it when it is text. */
    async options({
        resource,
        query,
    }: {
        resource: string;
        query: Query;
    }): Promise<OptionsResponse> {
        const resolved = this.registry.get({ resource });
        const { titleField } = resolved.schema;
        const searched = this.titleSearch({ resolved });
        const search = text(query.search);

        // nothing to search by finds nothing, rather than the first records whatever was typed
        if (search && !searched.length) return { data: [], hasMore: false };

        const records = await resolved.repository.find({
            where: search ? containing(searched, search) : undefined,
            order: fieldNamed(resolved, titleField)?.column
                ? { [titleField]: 'ASC' }
                : { [resolved.primaryColumn.propertyName]: 'DESC' },
            take: OPTIONS_PAGE + 1,
        });

        return {
            data: records
                .slice(0, OPTIONS_PAGE)
                .map((record) => related(resolved, record)),
            hasMore: records.length > OPTIONS_PAGE,
        };
    }

    /** A page of the records of a record's hasMany or belongsToMany field, listed as their own resource lists them. */
    async relatedList({
        resource,
        key,
        field,
        query,
    }: {
        resource: string;
        key: string;
        field: string;
        query: Query;
    }): Promise<ListResponse> {
        const { resolved, relationField, parentKey, target } =
            await this.relationOf({ resource, key, field });
        // the side of the relation on the related entity, which boot checked there is
        const inverse = relationField.relation?.inverseRelation
            ?.propertyName as string;

        return this.listOf({
            resolved: target,
            query,
            scope: {
                [inverse]: { [resolved.primaryColumn.propertyName]: parentKey },
            },
        });
    }

    /** Links records to a record through its belongsToMany field, or unlinks them, keeping them. */
    async link({
        resource,
        key,
        field,
        keys,
        attaching,
        actor,
    }: {
        resource: string;
        key: string;
        field: string;
        keys: unknown;
        attaching: boolean;
        actor: Actor;
    }): Promise<RelatedKeysResponse> {
        const { resolved, relationField, parent, parentKey, target } =
            await this.relationOf({
                resource,
                key,
                field,
                types: ['belongsToMany'],
            });

        if (relationField.schema.readonly)
            throw new BadRequestException(
                `${relationField.schema.label} are read-only`,
            );

        const parsed = this.parseKeys({ resolved: target, keys });
        const relation = resolved.repository
            .createQueryBuilder()
            .relation(resolved.metadata.target, relationField.field.name)
            .of(parentKey);
        // only what changes: linking one already linked is a duplicate the join table refuses
        const linkedBefore = new Set(
            (await relation.loadMany<object>()).map((record) =>
                String(keyOf(target, record)),
            ),
        );
        const changing = parsed.filter(
            (candidate) => linkedBefore.has(String(candidate)) !== attaching,
        );

        if (changing.length === 0) return { count: 0 };

        await this.write({
            resolved,
            run: () =>
                attaching ? relation.add(changing) : relation.remove(changing),
        });

        const linked = await target.repository.findBy(byKeys(target, changing));

        await this.log({
            resolved,
            actor,
            event: attaching ? 'attached' : 'detached',
            changed: [
                {
                    record: await this.serialize({ resolved, record: parent }),
                    changes: {
                        [relationField.field.name]: linked.map(
                            (record) => related(target, record).title,
                        ),
                    },
                },
            ],
        });

        return { count: changing.length };
    }

    /** Runs an action on records, with the values of its fields; resolves with what to tell the user. */
    async runAction({
        resource,
        action,
        keys,
        values,
        actor,
    }: {
        resource: string;
        action: string;
        keys: unknown;
        values: unknown;
        actor: Actor;
    }): Promise<ActionResponse> {
        const resolved = this.registry.get({ resource });
        const found = resolved.actions.find(
            ({ schema }) => schema.name === action,
        );

        if (!found)
            throw new NotFoundException(
                `No action "${action}" on ${resolved.schema.label}`,
            );

        const { standalone, label } = found.schema;
        const parsed = standalone ? [] : this.parseKeys({ resolved, keys });
        const checked = checkValues({
            fields: found.fields,
            input: values === undefined ? {} : body(values),
            creating: true,
        });

        if (Object.keys(checked.errors).length) throw invalid(checked.errors);

        // a deleted record's detail page offers its actions too
        const records = standalone
            ? []
            : await resolved.repository.find({
                  where: byKeys(resolved, parsed),
                  withDeleted: true,
              });

        if (!standalone && records.length === 0)
            throw new NotFoundException('None of these records exist');

        const result = await this.write({
            resolved,
            run: () =>
                found.action.handle({
                    records,
                    values: checked.values,
                    repository: resolved.repository,
                }),
        });
        // what was asked for, a password among it named but never kept
        const changes = {
            ...checked.values,
            ...passwordsIn(found.fields, checked.values),
        };

        await this.log({
            resolved,
            actor,
            event: 'action',
            action: found.schema.name,
            // a standalone action is kept once, under no record
            changed: (standalone
                ? [{ key: '', title: label }]
                : records.map((record) => related(resolved, record))
            ).map((record) => ({ record, changes })),
        });

        const { label: plural, singularLabel } = resolved.schema;
        const download = result?.download;

        return {
            message:
                result?.message ??
                (standalone
                    ? `${label}: done`
                    : `${label}: done for ${records.length} ${(records.length === 1 ? singularLabel : plural).toLowerCase()}`),
            ...(download && {
                download: {
                    filename: download.filename,
                    contentType: download.contentType,
                    base64: Buffer.from(download.content).toString('base64'),
                },
            }),
        };
    }

    /** Every card of the dashboard, for the range the query string picks; a card that fails is null. */
    async dashboard({ query }: { query: Query }): Promise<DashboardResponse> {
        const dashboard = this.registry.dashboard();

        if (!dashboard)
            throw new NotFoundException(
                'No dashboard: no provider extends Dashboard',
            );

        return this.cards({ cards: dashboard, query, where: 'the dashboard' });
    }

    /** Every card of a resource's index, for the range its page picks, as the dashboard's. */
    async resourceCards({
        resource,
        query,
    }: {
        resource: string;
        query: Query;
    }): Promise<DashboardResponse> {
        const resolved = this.registry.get({ resource });

        return this.cards({
            cards: resolved,
            query,
            where: resolved.schema.label,
        });
    }

    /** Stores a file for a file field, resolving with the value to save in it. */
    async upload({
        resource,
        field,
        file,
    }: {
        resource: string;
        field: string;
        file: UploadedFile | undefined;
    }): Promise<UploadResponse> {
        const resolved = this.registry.get({ resource });
        const found = fieldNamed(resolved, field, ['file']);

        // a file field the forms do not write takes no upload either
        if (!found?.field.isWritable)
            throw new NotFoundException(
                `${resolved.schema.label} have no file field "${field}"`,
            );
        if (!file)
            throw new BadRequestException(
                'Send the file as the "file" part of a multipart form',
            );

        const { label, upload } = found.schema;
        const errors: string[] = [];

        if (upload && file.size > upload.maxSize)
            errors.push(
                `${label} must be at most ${megabytes(upload.maxSize)}`,
            );
        if (
            upload?.accept.length &&
            !upload.accept.some((type) => accepts(type, file.mimeType))
        )
            errors.push(`${label} must be ${upload.accept.join(' or ')}`);

        if (errors.length) throw invalid({ [field]: errors });

        // the field's own store, which the registry made sure it has
        const value = await this.write({
            resolved,
            run: async () => found.field.storage?.({ file }),
        });

        return { data: fileValue(found.field, value) };
    }

    /** The records of every resource whose title, or a searched column, matches; five of each at most. */
    async search({ q }: { q: unknown }): Promise<SearchResponse> {
        const term = text(q);

        if (!term) return { data: [] };

        const found = await Promise.all(
            this.registry.all().map(async (resolved) => {
                const columns = this.titleSearch({ resolved });

                if (!columns.length) return undefined;

                const records = await resolved.repository.find({
                    where: containing(columns, term),
                    order: { [resolved.primaryColumn.propertyName]: 'DESC' },
                    take: SEARCH_PER_RESOURCE,
                });

                return records.length
                    ? {
                          resource: resolved.schema.name,
                          label: resolved.schema.label,
                          records: records.map((record) =>
                              related(resolved, record),
                          ),
                      }
                    : undefined;
            }),
        );

        return { data: found.filter((group) => group !== undefined) };
    }

    // what finding a record by name searches: its title when that is text, its searched columns otherwise
    private titleSearch({ resolved }: { resolved: ResolvedResource }) {
        const { titleField } = resolved.schema;

        return isText(fieldNamed(resolved, titleField)?.column)
            ? [titleField]
            : resolved.searchColumns;
    }

    // cards for one range: one the picker offers, days such as 2026-10-01..2026-10-09, or the default
    private async cards({
        cards: { ranges, schema, metrics },
        query,
        where,
    }: {
        cards: ResolvedCards;
        query: Query;
        where: string;
    }): Promise<DashboardResponse> {
        const asked = String(query.range ?? '');
        const range =
            ranges.get(asked) ??
            (isDays(asked) ? asked : undefined) ??
            ranges.get(String(schema.defaultRange)) ??
            'all';
        const { from, to } = period({ range }).current;
        const day = (time: number) => new Date(time).toISOString().slice(0, 10);

        return {
            range: {
                value: String(range),
                label:
                    schema.ranges.find(({ value }) => value === String(range))
                        ?.label ?? (range === 'all' ? PERIODS.all : 'Custom'),
                from: from && day(from.getTime()),
                // the last day it covers, as it ends where the next starts
                to: day(to.getTime() - DAY),
            },
            cards: await Promise.all(
                metrics.map(async (resolved) => ({
                    name: resolved.schema.name,
                    result: await this.calculate({ resolved, range }).catch(
                        (error: unknown) => {
                            this.logger.error(
                                `The ${resolved.schema.name} card of ${where} failed`,
                                error instanceof Error ? error.stack : error,
                            );

                            return null;
                        },
                    ),
                })),
            ),
        };
    }

    // a value says what its previous covers, for `+20% from last month`
    private async calculate({
        resolved: { metric, repository },
        range,
    }: {
        resolved: ResolvedMetric;
        range: RangeValue;
    }): Promise<MetricResult> {
        const result = await metric.calculate({
            range,
            dataSource: this.dataSource,
            // none for a dashboard card without an entity, which calculates with the data source
            repository: repository as Repository<object>,
        });
        const compared =
            metric.type === 'value' ? comparedWith(range) : undefined;

        return {
            ...result,
            type: metric.type,
            ...(compared && { comparedWith: compared }),
        } as MetricResult;
    }

    // the entities of these keys that exist and meet `where`, and the records the log keeps of them; deleted ones too when asked
    private async loadKeys({
        resolved,
        keys,
        withDeleted,
        where = {},
    }: {
        resolved: ResolvedResource;
        keys: unknown;
        withDeleted: boolean;
        where?: FindOptionsWhere<object>;
    }) {
        const entities = await resolved.repository.find({
            where: {
                ...byKeys(resolved, this.parseKeys({ resolved, keys })),
                ...where,
            },
            relations: relationsToLoad(resolved),
            withDeleted,
        });

        return {
            entities,
            records: await Promise.all(
                entities.map((record) => this.serialize({ resolved, record })),
            ),
        };
    }

    // kept in the activity log, when the resource keeps one
    private async log({
        resolved,
        actor,
        event,
        action,
        changed,
    }: {
        resolved: ResolvedResource;
        actor: Actor;
        event: ActivityEvent;
        action?: string;
        /** Each record changed, as the API shows it or at least its key and title, with what changed. */
        changed: { record: RelatedRecord; changes: Record<string, unknown> }[];
    }): Promise<void> {
        if (!resolved.resource.logActivity) return;

        await this.activityLog.record({
            actor,
            entries: changed.map(({ record, changes }) => ({
                resource: resolved.schema.name,
                recordKey: record.key,
                recordTitle: record.title,
                event,
                action,
                changes,
            })),
        });
    }

    private async listOf({
        resolved,
        query,
        scope = {},
    }: {
        resolved: ResolvedResource;
        query: Query;
        /** Conditions every record listed meets, as a relation's records do. */
        scope?: FindOptionsWhere<object>;
    }): Promise<ListResponse> {
        const { schema, repository, primaryColumn } = resolved;
        const { page, perPage, sort, direction, search } = paging(
            schema,
            query,
        );
        const trashed = schema.softDeletes ? query.trashed : undefined;
        const where = listWhere(resolved, {
            search,
            base: {
                ...filterConditions(resolved, query),
                ...scope,
                ...(trashed === 'only' && {
                    [String(schema.deletedAtField)]: Not(IsNull()),
                }),
            },
        });
        const sorted = fieldNamed(resolved, sort);
        // a belongsTo sorts by the title of the record it points at, which is loaded with it;
        // the key last, so records with the same sorted value keep one order across pages
        const order = {
            [sort]:
                sorted?.schema.type === 'belongsTo' && sorted.target
                    ? {
                          [this.registry.get({ resource: sorted.target }).schema
                              .titleField]: direction,
                      }
                    : direction,
            [primaryColumn.propertyName]: direction,
        };
        const options = {
            where,
            order,
            relations: relationsToLoad(resolved),
            withDeleted: trashed === 'with' || trashed === 'only',
            skip: (page - 1) * perPage,
        };

        let records: object[];
        let total: number | null = null;

        if (resolved.resource.countRows)
            [records, total] = await repository.findAndCount({
                ...options,
                take: perPage,
            });
        // one more than a page, to tell whether there is a next one without counting
        else records = await repository.find({ ...options, take: perPage + 1 });

        return {
            data: await Promise.all(
                records
                    .slice(0, perPage)
                    .map((record) =>
                        this.serialize({ resolved, record, page: 'index' }),
                    ),
            ),
            meta: {
                page,
                perPage,
                total,
                lastPage:
                    total === null
                        ? null
                        : Math.max(1, Math.ceil(total / perPage)),
                hasMore:
                    total === null
                        ? records.length > perPage
                        : page * perPage < total,
            },
        };
    }

    // the resource, its relation field of one of these types, the record and its key, and the related resource
    private async relationOf({
        resource,
        key,
        field,
        types = ['hasMany', 'belongsToMany'],
    }: {
        resource: string;
        key: string;
        field: string;
        types?: FieldSchema['type'][];
    }) {
        const resolved = this.registry.get({ resource });
        const relationField = fieldNamed(resolved, field, types);

        if (!relationField?.target)
            throw new NotFoundException(
                `${resolved.schema.label} have no ${types.join(' or ')} "${field}"`,
            );

        const parent = await this.findRecord({ resolved, key });

        return {
            resolved,
            relationField,
            parent,
            parentKey: keyOf(resolved, parent),
            target: this.registry.get({ resource: relationField.target }),
        };
    }

    // a key the column cannot hold is a record that does not exist, rather than a database error
    private parseKey({
        resolved,
        key,
    }: {
        resolved: ResolvedResource;
        key: unknown;
    }): RecordKey {
        const type = columnType(resolved.primaryColumn);
        const text = String(key);
        const missing = () =>
            new NotFoundException(
                `No ${resolved.schema.singularLabel.toLowerCase()} ${text}`,
            );
        const max = INT_MAX[type];

        if (max !== undefined) {
            if (!/^\d+$/.test(text) || BigInt(text) > max) throw missing();

            // a bigint stays text, as a JavaScript number cannot hold every one
            return max > BigInt(Number.MAX_SAFE_INTEGER) ? text : Number(text);
        }

        if (type === 'uuid') {
            if (!UUID.test(text)) throw missing();

            // as Postgres gives them back, to compare with
            return text.toLowerCase();
        }

        return text;
    }

    private parseKeys({
        resolved,
        keys,
    }: {
        resolved: ResolvedResource;
        keys: unknown;
    }): RecordKey[] {
        if (!Array.isArray(keys) || keys.length === 0 || keys.length > MAX_KEYS)
            throw new BadRequestException(
                `Give the keys of 1 to ${MAX_KEYS} records`,
            );

        return [
            ...new Set(keys.map((key) => this.parseKey({ resolved, key }))),
        ];
    }

    private async findRecord({
        resolved,
        key,
    }: {
        resolved: ResolvedResource;
        key: string;
    }): Promise<object> {
        const parsed = this.parseKey({ resolved, key });
        // a soft-deleted record is still shown, to restore it
        const record = await resolved.repository.findOne({
            where: { [resolved.primaryColumn.propertyName]: parsed },
            relations: relationsToLoad(resolved),
            withDeleted: true,
        });

        if (!record)
            throw new NotFoundException(
                `No ${resolved.schema.singularLabel.toLowerCase()} ${parsed}`,
            );

        return record;
    }

    private async validate({
        resolved,
        input,
        creating,
    }: {
        resolved: ResolvedResource;
        input: RecordInput;
        creating: boolean;
    }): Promise<Record<string, unknown>> {
        const { values, errors } = checkValues({
            fields: resolved.fields,
            input,
            creating,
        });
        const dto = creating
            ? resolved.resource.createDto
            : (resolved.resource.updateDto ?? resolved.resource.createDto);

        if (dto) {
            // the input as sent, which is what the project's own DTO is written for
            const given = Object.fromEntries(
                Object.keys(values).map((name) => [name, input[name]]),
            );
            const problems = await validate(plainToInstance(dto, given), {
                skipMissingProperties: !creating,
                forbidUnknownValues: false,
            });

            // the DTO's word on a value checkValues let through; one it refused has its error already
            for (const { property, constraints } of problems)
                if (constraints && !errors[property])
                    errors[property] = Object.values(constraints);
        }

        for (const relationField of resolved.fields)
            await this.pointAt({ relationField, values, errors });

        if (Object.keys(errors).length) throw invalid(errors);

        return values;
    }

    // a belongsTo's key becomes the record it names, which must exist, for TypeORM to set the foreign key
    private async pointAt({
        relationField: { field, schema, target },
        values,
        errors,
    }: {
        relationField: ResolvedField;
        values: Record<string, unknown>;
        errors: Record<string, string[]>;
    }): Promise<void> {
        const given = values[field.name];

        if (schema.type !== 'belongsTo' || !target || given == null) return;

        const related = this.registry.get({ resource: target });
        const keyName = related.primaryColumn.propertyName;
        const missing = `${schema.label}: no ${related.schema.singularLabel.toLowerCase()} ${given}`;

        try {
            const key = this.parseKey({ resolved: related, key: given });

            // a soft-deleted record is still one to point at, as one already pointing at it is saved again
            if (
                await related.repository.exists({
                    where: { [keyName]: key },
                    withDeleted: true,
                })
            )
                values[field.name] = { [keyName]: key };
            else errors[field.name] = [missing];
        } catch (error) {
            if (!(error instanceof NotFoundException)) throw error;

            errors[field.name] = [missing];
        }
    }

    // what the database refuses for the values is the request's fault, and says why
    private async write<T>({
        resolved,
        run,
    }: {
        resolved: ResolvedResource;
        run: () => Promise<T>;
    }): Promise<T> {
        try {
            return await run();
        } catch (error) {
            const driverError = postgresError(error);

            if (driverError?.code === '23505')
                throw new ConflictException(
                    driverError.detail ?? 'A record with these values exists',
                );
            // a NOT NULL column no field gave a value, e.g. one a resource forgot to make required()
            if (driverError?.code === '23502' && driverError.column) {
                // by the field's name, as the form knows it, rather than the column's
                const name =
                    resolved.metadata.findColumnWithDatabaseName(
                        driverError.column,
                    )?.propertyName ?? driverError.column;

                throw invalid({ [name]: [`${humanize(name)} is required`] });
            }
            // 23503 for a missing or, under NO ACTION, a referring row; 23001 for one under RESTRICT
            if (driverError?.code === '23503' || driverError?.code === '23001')
                throw new ConflictException(
                    driverError.detail ?? 'Other records refer to it',
                );
            // a value its column cannot hold, e.g. a number too large for it or the year 0
            if (driverError?.code?.startsWith('22'))
                throw invalid({}, driverError.message);

            throw error;
        }
    }

    private async serialize({
        resolved,
        record,
        page,
    }: {
        resolved: ResolvedResource;
        record: object;
        /** The page it is shown on, which computes only the computed fields shown there; every field when unset. */
        page?: 'index' | 'detail';
    }): Promise<RecordData> {
        const row = record as Record<string, unknown>;
        const { deletedAtField } = resolved.schema;
        // what a list shows is said of each row; of a record, what its detail page or form shows
        const shows = ({ visibility }: FieldSchema) =>
            page ? visibility[page] : visibility.detail || visibility.update;
        // whether a record is deleted, as its row says, shown or not
        const values: Record<string, unknown> = deletedAtField
            ? { [deletedAtField]: row[deletedAtField] ?? null }
            : {};

        for (const { field, schema, target } of resolved.fields) {
            if (schema.type === 'password' || field.isToMany || !shows(schema))
                continue;

            const value = row[field.name];

            if (schema.type === 'belongsTo')
                values[field.name] =
                    value && target
                        ? related(
                              this.registry.get({ resource: target }),
                              value as object,
                          )
                        : null;
            else if (schema.type === 'file')
                values[field.name] =
                    value == null ? null : fileValue(field, value, record);
            else
                values[field.name] = field.computed
                    ? await field.computed(record)
                    : value;
        }

        return { ...related(resolved, record), values };
    }
}
