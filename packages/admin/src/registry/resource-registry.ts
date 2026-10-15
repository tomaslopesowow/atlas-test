import {
    Injectable,
    NotFoundException,
    type OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import type {
    FieldSchema,
    FilterType,
    ResourceSchema,
} from '@repo/admin-contract';
import { DataSource, type EntityMetadata, type Repository } from 'typeorm';
import { AdminActivityEntity } from '../activity/activity.entity.js';
import { AdminAuthenticator } from '../auth/admin-authenticator.js';
import type { Field } from '../fields/field.js';
import { FieldFilter } from '../filters/filter.js';
import { PERIODS, period, YEAR } from '../metrics/aggregates.js';
import {
    Dashboard,
    type Metric,
    Partition,
    Trend,
    Value,
} from '../metrics/metric.js';
import { Resource } from '../resources/resource.js';
import type {
    ColumnDefaults,
    ColumnMetadata,
    RangeOption,
    RangeValue,
    RelationMetadata,
    ResolvedAction,
    ResolvedCards,
    ResolvedDashboard,
    ResolvedField,
    ResolvedFilter,
    ResolvedMetric,
    ResolvedResource,
} from '../types/types.js';
import { defined, humanize, kebab, pluralize } from '../utils.js';
import { isText } from './column-type.js';

const TITLE_FIELDS = ['name', 'title', 'label', 'email', 'subject'];

// a name is a segment of a url and a key of a query string
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// the filter a filterable field of each type has
const FIELD_FILTERS: Partial<Record<string, FilterType>> = {
    select: 'select',
    boolean: 'boolean',
    date: 'dateRange',
    datetime: 'dateRange',
};

// the metric classes that count their entity's rows themselves, unless a subclass calculates its own
const BUILT_IN = [Value, Trend, Partition];

/** Which relations each relation field type can show. */
const RELATION_KINDS: Partial<
    Record<string, (relation: RelationMetadata) => boolean>
> = {
    belongsTo: (relation) =>
        (relation.isManyToOne || relation.isOneToOneOwner) &&
        relation.joinColumns.length === 1,
    hasMany: (relation) => relation.isOneToMany,
    belongsToMany: (relation) => relation.isManyToMany,
};

/** A resource found at boot, before its fields resolve. */
interface PendingResource {
    instance: Resource;
    metadata: EntityMetadata;
    name: string;
}

// the entity as a url names it: its table, when it names one, or its class without Entity
const entityName = (metadata: EntityMetadata) =>
    metadata.givenTableName ?? metadata.targetName.replace(/Entity$/, '');

// the entity as a label names one, by its class, as a table is often plural: `Blog post`
const entityLabel = (metadata: EntityMetadata) =>
    humanize(metadata.targetName.replace(/Entity$/, ''));

// the class name in kebab case without its suffix, e.g. PublishPostsAction as publish-posts
const classKey = (item: object, suffix: string) =>
    kebab(item.constructor.name.replace(new RegExp(`${suffix}$`), ''));

const checkName = (name: string, where: string) => {
    if (!NAME.test(name))
        throw new Error(
            `${where} is named "${name}", where a name is lowercase letters, digits and dashes, e.g. "new-users"`,
        );

    return name;
};

// the first name given twice among these
const twice = (names: string[]) =>
    names.find((name, i) => names.indexOf(name) !== i);

// stops the app at boot on a name twice among these, e.g. `${where} has two fields`
const once = (names: string[], what: string) => {
    const repeated = twice(names);

    if (repeated !== undefined) throw new Error(`${what} named "${repeated}"`);
};

// the one provider extending a class, if any; two stop the app at boot, saying why there is one
const single = <T>(
    providers: unknown[],
    type: abstract new (...args: never[]) => T,
    why: string,
): T | null => {
    const found = providers.filter(
        (instance): instance is T => instance instanceof type,
    );

    if (found.length > 1)
        throw new Error(
            `${found.map((instance) => (instance as object).constructor.name).join(' and ')} extend ${type.name}: ${why}`,
        );

    return found[0] ?? null;
};

// what a form needs of a select or custom field to show it, on a resource or an action
const checkShown = (field: Field, schema: FieldSchema, named: string) => {
    if (field.type === 'select' && !schema.options?.length)
        throw new Error(
            `${named} is a select without options; give it options() or an enum column`,
        );
    if (field.type === 'custom' && !field.component)
        throw new Error(
            `${named} is custom, without the component the panel shows it with`,
        );
};

// a range as a picker labels it, or undefined for one no period reads
const rangeLabel = (option: RangeOption) => {
    if (typeof option === 'object') return option.label;
    if (typeof option === 'number')
        return Number.isInteger(option) && option > 0
            ? option === 1
                ? 'Today'
                : `${option} days`
            : undefined;
    if (Object.hasOwn(PERIODS, option))
        return PERIODS[option as keyof typeof PERIODS];

    return YEAR.test(option) ? option : undefined;
};

// what a column says of a field its resource left unset; `blank` is a new record as the entity's class makes one
const columnDefaults = (
    column: ColumnMetadata,
    blank: Record<string, unknown>,
): ColumnDefaults => {
    const written =
        !column.isGenerated &&
        !column.isCreateDate &&
        !column.isUpdateDate &&
        !column.isDeleteDate &&
        !column.isVersion;
    const length = Number(column.length);

    return {
        nullable: column.isNullable,
        // what neither the database nor the entity's class fills in must be given
        required:
            written &&
            !column.isNullable &&
            column.default === undefined &&
            blank[column.propertyName] === undefined,
        ...(length > 0 && { maxLength: length }),
        offForms: !written,
        ...(column.enum && { options: column.enum }),
    };
};

@Injectable()
export class ResourceRegistry implements OnModuleInit {
    private readonly resources = new Map<string, ResolvedResource>();
    private resolvedDashboard: ResolvedDashboard | null = null;
    private signIn: AdminAuthenticator | null = null;

    constructor(
        private readonly discovery: DiscoveryService,

        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    // every instance exists by now, and a mistake in a resource stops the app at boot
    onModuleInit(): void {
        const providers = this.discovery
            .getProviders()
            .map(({ instance }) => instance as unknown);
        const pending = providers
            .filter((instance) => instance instanceof Resource)
            .map((instance) => this.prepare({ instance }));

        const clash = twice(pending.map(({ name }) => name));

        if (clash !== undefined)
            throw new Error(
                `${pending
                    .filter(({ name }) => name === clash)
                    .map(({ instance }) => instance.constructor.name)
                    .join(
                        ' and ',
                    )} are admin resources named "${clash}": give one a uriKey of its own`,
            );

        // a relation links to a resource, so every name is known before any resolves
        for (const resource of pending)
            this.resources.set(
                resource.name,
                this.resolve({ ...resource, pending }),
            );

        const logging = pending.find(({ instance }) => instance.logActivity);

        if (logging && !this.dataSource.hasMetadata(AdminActivityEntity))
            throw new Error(
                `The ${logging.name} admin resource keeps an activity log, but the data source has no AdminActivityEntity: set autoLoadEntities, list ADMIN_ENTITIES among the entities, or set logActivity = false`,
            );

        const dashboard = single(
            providers,
            Dashboard,
            'the panel has one dashboard, so one class lists its cards',
        );

        this.resolvedDashboard = dashboard && this.resolveDashboard(dashboard);
        this.signIn = single(
            providers,
            AdminAuthenticator,
            'the panel signs in one way',
        );
    }

    /** The dashboard, or null when no provider extends Dashboard. */
    dashboard(): ResolvedDashboard | null {
        return this.resolvedDashboard;
    }

    /** The app's sign-in, or null when no provider extends AdminAuthenticator. */
    authenticator(): AdminAuthenticator | null {
        return this.signIn;
    }

    all(): ResolvedResource[] {
        return [...this.resources.values()];
    }

    get({ resource }: { resource: string }): ResolvedResource {
        const resolved = this.resources.get(resource);

        if (!resolved)
            throw new NotFoundException(`No admin resource "${resource}"`);

        return resolved;
    }

    private prepare({ instance }: { instance: Resource }): PendingResource {
        const { entity } = instance;
        const where = `The ${instance.constructor.name} admin resource`;

        if (!entity || !this.dataSource.hasMetadata(entity))
            throw new Error(
                `${where} shows ${entity?.name ?? 'no entity'}, which is no entity TypeORM knows: set entity = YourEntity`,
            );

        const metadata = this.dataSource.getMetadata(entity);
        const name = checkName(
            instance.uriKey ?? kebab(entityName(metadata)),
            where,
        );

        return { instance, metadata, name };
    }

    private resolve({
        instance,
        metadata,
        name,
        pending,
    }: PendingResource & { pending: PendingResource[] }): ResolvedResource {
        const where = `the ${name} admin resource`;
        const [primaryColumn, ...more] = metadata.primaryColumns;

        if (!primaryColumn || more.length)
            throw new Error(
                `${where} needs an entity with one primary key column`,
            );

        const blank = metadata.create() as Record<string, unknown>;
        const fields = instance
            .fields()
            .map((field) =>
                this.resolveField({ field, metadata, blank, pending, where }),
            );

        once(
            fields.map(({ field }) => field.name),
            `${where} has two fields`,
        );

        const titleField =
            instance.title ??
            TITLE_FIELDS.find((title) =>
                fields.some(
                    ({ field, column }) => column && field.name === title,
                ),
            ) ??
            primaryColumn.propertyName;

        if (!metadata.columns.some((c) => c.propertyName === titleField))
            throw new Error(
                `${where} has no column "${titleField}" to title records by`,
            );

        // by default the text a page shows, so nothing kept off every page can be guessed at
        const searchColumns =
            instance.search ??
            fields
                .filter(
                    ({ column, schema }) =>
                        isText(column) &&
                        schema.type !== 'password' &&
                        (schema.visibility.index || schema.visibility.detail),
                )
                .map(({ field }) => field.name);

        for (const searched of searchColumns)
            if (
                !isText(
                    fields.find(({ field }) => field.name === searched)?.column,
                )
            )
                throw new Error(
                    `${where} searches "${searched}", which is no text field`,
                );

        // the primary key sorts as a column, whether or not it is among the fields
        const defaultSort = instance.defaultSort ?? {
            field: primaryColumn.propertyName,
            direction: 'desc',
        };

        if (
            instance.defaultSort &&
            !fields.some(
                ({ field, schema }) =>
                    field.name === defaultSort.field && schema.sortable,
            )
        )
            throw new Error(
                `${where} sorts by "${defaultSort.field}", which is no sortable field`,
            );

        if (!instance.perPageOptions.includes(instance.perPage))
            throw new Error(
                `${where} shows ${instance.perPage} a page, which is not among its perPageOptions`,
            );

        const repository = this.dataSource.getRepository<object>(
            metadata.target,
        );
        const filters = this.resolveFilters({ instance, fields, where });
        const actions = this.resolveActions({ instance, where });
        const cards = this.resolveCards({
            metrics: instance.cards(),
            options: instance.ranges,
            defaultRange: instance.defaultRange,
            repository,
            where,
        });
        const singularLabel = instance.singularLabel ?? entityLabel(metadata);
        const schema: ResourceSchema = {
            name,
            label: instance.label ?? pluralize(singularLabel),
            singularLabel,
            titleField,
            searchable: searchColumns.length > 0,
            perPage: instance.perPage,
            perPageOptions: instance.perPageOptions,
            defaultSort,
            fields: fields.map(({ schema }) => schema),
            filters: filters.map(({ schema }) => schema),
            actions: actions.map(({ schema }) => schema),
            metrics: cards.metrics.map(({ schema }) => schema),
            ...cards.schema,
            softDeletes: metadata.deleteDateColumn !== undefined,
            deletedAtField: metadata.deleteDateColumn?.propertyName ?? null,
            logsActivity: instance.logActivity,
        };

        return {
            ...cards,
            resource: instance,
            metadata,
            repository,
            primaryColumn,
            fields,
            filters,
            actions,
            searchColumns,
            schema,
        };
    }

    private resolveField({
        field,
        metadata,
        blank,
        pending,
        where,
    }: {
        field: Field;
        metadata: EntityMetadata;
        blank: Record<string, unknown>;
        pending: PendingResource[];
        where: string;
    }): ResolvedField {
        const named = `${where} has a field "${field.name}" that`;

        if (!field.isRelation) {
            // a foreign key declared beside its relation is a column too; the relation's own is not
            const column = field.computed
                ? undefined
                : metadata.columns.find(
                      (candidate) =>
                          candidate.propertyName === field.name &&
                          candidate.relationMetadata?.propertyName !==
                              field.name,
                  );

            if (!column && !field.computed)
                throw new Error(
                    `${named} is no column; give make() a function to compute it`,
                );
            if (column) field.defaults(columnDefaults(column, blank));

            const schema = field.toSchema();

            if (schema.sortable && !column)
                throw new Error(`${named} is computed, so it cannot sort`);
            if (field.type === 'file' && !field.storage)
                throw new Error(
                    `${named} is a file field with nowhere to store files; give it store()`,
                );
            checkShown(field, schema, named);

            return { field, column, schema };
        }

        const relation = metadata.relations.find(
            ({ propertyName }) => propertyName === field.name,
        );

        if (!relation) throw new Error(`${named} is no relation`);
        if (!RELATION_KINDS[field.type]?.(relation))
            throw new Error(`${named} is no ${field.type} relation`);

        const inverse = relation.inverseEntityMetadata;
        const listedBy =
            field.resource &&
            pending.find(
                ({ instance }) => instance.constructor === field.resource,
            );

        if (field.resource && !listedBy)
            throw new Error(
                `${named} lists its records by ${field.resource.name}, which is no admin resource`,
            );
        if (listedBy && listedBy.metadata.target !== inverse.target)
            throw new Error(
                `${named} lists its records by ${field.resource?.name}, which is no resource of ${inverse.name}`,
            );

        // by default the first resource of the related entity
        const target = (
            listedBy ||
            pending.find(({ metadata }) => metadata.target === inverse.target)
        )?.name;

        if (!target)
            throw new Error(
                `${named} relates to ${inverse.name}, which has no admin resource`,
            );
        if (field.isToMany && !relation.inverseRelation)
            throw new Error(
                `${named} has no inverse side, to find its records by`,
            );

        // the foreign key's own column says, as one declared NOT NULL beside the relation does
        const nullable =
            relation.joinColumns[0]?.isNullable ?? relation.isNullable;

        field.defaults({ nullable, required: !nullable });

        const schema = field.toSchema();

        if (schema.sortable && field.isToMany)
            throw new Error(`${named} lists records, so it cannot sort`);

        return {
            field,
            relation,
            target,
            schema: {
                ...schema,
                relation: {
                    resource: target,
                    ...(field.type === 'hasMany' && {
                        inverse: relation.inverseRelation?.propertyName,
                    }),
                },
            },
        };
    }

    private resolveFilters({
        instance,
        fields,
        where,
    }: {
        instance: Resource;
        fields: ResolvedField[];
        where: string;
    }): ResolvedFilter[] {
        // a filterable field's own filter comes after the resource's
        const fromFields = fields
            .filter(({ field }) => field.filtered)
            .map(({ field, column, schema }) => {
                const type = FIELD_FILTERS[field.type];

                if (!type || !column)
                    throw new Error(
                        `${where} filters by "${field.name}", where only a select, boolean or date column can`,
                    );

                return new FieldFilter({
                    name: kebab(field.name),
                    property: field.name,
                    label: schema.label,
                    type,
                    choices: schema.options,
                });
            });
        const filters = [...instance.filters(), ...fromFields].map(
            (filter): ResolvedFilter => {
                const name = checkName(
                    filter.name ?? classKey(filter, 'Filter'),
                    `a filter of ${where}`,
                );
                const options =
                    filter.type === 'select' ? filter.options() : [];

                if (filter.type === 'select' && !options.length)
                    throw new Error(
                        `${where} has a select filter "${name}" without options`,
                    );

                return {
                    filter,
                    schema: {
                        name,
                        label: filter.label ?? humanize(name),
                        type: filter.type,
                        ...(filter.type === 'select' && { options }),
                    },
                };
            },
        );

        once(
            filters.map(({ schema }) => schema.name),
            `${where} has two filters`,
        );

        return filters;
    }

    private resolveActions({
        instance,
        where,
    }: {
        instance: Resource;
        where: string;
    }): ResolvedAction[] {
        const actions = instance.actions().map((action): ResolvedAction => {
            const name = checkName(
                action.name ?? classKey(action, 'Action'),
                `an action of ${where}`,
            );
            const fields = action.fields().map((field) => {
                // its values come in one request, so nothing it asks for is uploaded or picked first
                if (field.isRelation || field.computed || field.type === 'file')
                    throw new Error(
                        `the ${name} action of ${where} asks for "${field.name}", which can only be a plain value`,
                    );

                const schema = field.toSchema();

                checkShown(
                    field,
                    schema,
                    `the ${name} action of ${where} has a field "${field.name}" that`,
                );

                return { field, schema };
            });

            return {
                action,
                fields,
                schema: {
                    name,
                    label: action.label ?? humanize(name),
                    destructive: action.destructive,
                    ...defined({ confirmText: action.confirmText }),
                    showOnIndex: action.showOnIndex,
                    showOnDetail: action.showOnDetail && !action.standalone,
                    standalone: action.standalone,
                    fields: fields.map(({ schema }) => schema),
                },
            };
        });

        once(
            actions.map(({ schema }) => schema.name),
            `${where} has two actions`,
        );

        return actions;
    }

    private resolveDashboard(dashboard: Dashboard): ResolvedDashboard {
        const cards = this.resolveCards({
            metrics: dashboard.cards(),
            options: dashboard.ranges,
            defaultRange: dashboard.defaultRange,
            where: 'the admin dashboard',
        });

        return {
            ...cards,
            schema: {
                label: dashboard.label,
                ...cards.schema,
                cards: cards.metrics.map(({ schema }) => schema),
            },
        };
    }

    // the cards, and the ranges of their picker; `repository` is the resource's, for a card that names no entity
    private resolveCards({
        metrics,
        options,
        defaultRange,
        repository,
        where,
    }: {
        metrics: Metric[];
        options: RangeOption[];
        defaultRange?: RangeValue;
        repository?: Repository<object>;
        where: string;
    }): ResolvedCards {
        const resolved = metrics.map((metric): ResolvedMetric => {
            const builtIn = BUILT_IN.some(
                (type) => metric.calculate === type.prototype.calculate,
            );
            const counted = metric.entity
                ? this.dataSource.getRepository<object>(metric.entity)
                : repository;
            // a built-in card is named by what it counts, as a subclass is by its class
            const label =
                metric.label ??
                (builtIn && counted
                    ? `${pluralize(entityLabel(counted.metadata))}${metric instanceof Partition && metric.column ? ` by ${humanize(metric.column).toLowerCase()}` : ''}`
                    : undefined);
            const name = checkName(
                metric.name ??
                    (metric.label
                        ? kebab(metric.label)
                        : label
                          ? kebab(`${label} ${metric.type}`)
                          : classKey(metric, 'Metric')),
                `a card of ${where}`,
            );

            if (builtIn && !counted)
                throw new Error(
                    `the ${name} card of ${where} counts no entity's rows: give it an entity`,
                );
            if (builtIn && metric instanceof Partition && !metric.column)
                throw new Error(
                    `the ${name} card of ${where} groups by no column: give it a column`,
                );

            return {
                metric,
                repository: counted,
                schema: {
                    name,
                    label: label ?? humanize(name),
                    type: metric.type,
                    width: metric.width,
                    ...defined({
                        prefix: metric.prefix,
                        suffix: metric.suffix,
                    }),
                    ...((metric instanceof Trend ||
                        metric instanceof Partition) && {
                        chart: metric.chart,
                    }),
                },
            };
        });

        once(
            resolved.map(({ schema }) => schema.name),
            `${where} has two cards`,
        );

        const ranges = options.map((option) => {
            const value = typeof option === 'object' ? option.value : option;
            const label = rangeLabel(option);

            // a page shows the days a range covers, so each must be one period() can date
            try {
                if (label === undefined) throw new Error();
                period({ range: value });
            } catch {
                throw new Error(
                    `${where} has a range "${value}" it cannot date: a number of days, today, week, month, year, all or a year`,
                );
            }

            return { value, schema: { value: String(value), label } };
        });
        const keys = ranges.map(({ schema }) => schema.value);

        once(keys, `${where} offers two ranges`);

        if (defaultRange !== undefined && !keys.includes(String(defaultRange)))
            throw new Error(
                `${where} defaults to the range "${defaultRange}", which it does not offer`,
            );

        return {
            metrics: resolved,
            ranges: new Map(
                ranges.map(({ value, schema }) => [schema.value, value]),
            ),
            schema: {
                ranges: ranges.map(({ schema }) => schema),
                // the one given, else this month, else 30 days, else the first
                defaultRange:
                    defaultRange !== undefined
                        ? String(defaultRange)
                        : (['month', '30'].find((key) => keys.includes(key)) ??
                          keys[0] ??
                          null),
            },
        };
    }
}
