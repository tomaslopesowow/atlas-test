import type { Sort } from '@repo/admin-contract';
import type { Action } from '../actions/action.js';
import type { AfterAttribute, Field, FieldClass } from '../fields/field.js';
import type { AnyFilter } from '../filters/filter.js';
import type { Metric } from '../metrics/metric.js';
import type {
    CreateInput,
    DeleteRecordsInput,
    FieldResolver,
    RangeOption,
    RangeValue,
    UpdateInput,
} from '../types/types.js';

/** The properties of an entity, as field names; any name for a resource that names no entity type. */
export type AttributeOf<TEntity> = object extends TEntity
    ? string
    : Extract<keyof TEntity, string>;

/**
 * Extended once per entity the panel shows, and listed in a module's providers, as a Nova
 * resource: `entity` names the entity, as Nova's `$model`, and it shows the fields it lists.
 */
export abstract class Resource<TEntity extends object = object> {
    /** The entity it shows, e.g. `entity = PostEntity`. */
    abstract entity: new (
        ...args: never[]
    ) => TEntity;
    /** Its segment in the urls: the entity's table, if it names one, or class, without Entity, in kebab case, e.g. `blog-post`. */
    uriKey?: string;
    label?: string;
    singularLabel?: string;
    /** The field a record is named by; the first of name, title, label, email or subject, or the primary key, when unset. */
    title?: string;
    /** Text columns a search looks through; every text field's when unset. */
    search?: string[];
    perPage = 25;
    perPageOptions = [10, 25, 50, 100];
    /** The primary key, newest first, when unset. */
    defaultSort?: Sort;
    /** Off for a table too large to count on every page, which then pages without a total. */
    countRows = true;
    /** A class-validator DTO a create must also pass, e.g. the one the project's own API takes. */
    createDto?: new () => object;
    /** As createDto, checked with skipMissingProperties; the createDto when unset. */
    updateDto?: new () => object;
    /** Keeps every change made through the panel in the activity log; off for a resource too noisy to. */
    logActivity = true;
    /** The ranges of the picker over its cards, which covers them all, as the dashboard's does. */
    ranges: RangeOption[] = ['today', 'week', 'month', 'year', 'all'];
    /** One of its ranges, picked when the page opens; this month, else 30 days, else the first. */
    defaultRange?: RangeValue;

    /** The fields, in order, e.g. `[this.make(ID), this.make(Text, 'title').sortable()]`. */
    abstract fields(): Field[];

    /**
     * A field of the entity: `this.make(Text, 'body')`, the name one of its properties, as the
     * editor offers them; `this.make(ID)` for `id`. A computed field takes any name, and the function
     * computing it: `this.make(NumberField, 'words', (post) => post.body.split(' ').length)`.
     */
    protected make<C extends new () => Field>(type: C): InstanceType<C>;
    protected make<C extends FieldClass>(
        type: C,
        attribute: string,
        compute: FieldResolver<TEntity>,
    ): InstanceType<C>;
    protected make<C extends FieldClass>(
        type: C,
        attribute: AttributeOf<TEntity>,
        ...rest: AfterAttribute<ConstructorParameters<C>>
    ): InstanceType<C>;
    protected make(type: FieldClass, ...args: unknown[]): Field {
        return new (type as unknown as new (...args: unknown[]) => Field)(
            ...args,
        );
    }

    /** The filters of its list. */
    filters(): AnyFilter<TEntity>[] {
        return [];
    }

    /** What can be done to its records besides editing them. */
    actions(): Action<TEntity>[] {
        return [];
    }

    /** Cards at the top of its index, for the range its picker sets; each counts the resource's rows unless it names its own entity. */
    cards(): Metric[] {
        return [];
    }

    // Each write goes through one of these; override one to go through a service instead,
    // e.g. media's upload, which stores a file before the row. The defaults write by key, which
    // fires no entity subscriber: an override that must, removes the `records` it gets instead.

    async create({
        values,
        repository,
    }: CreateInput<TEntity>): Promise<TEntity> {
        return repository.save(repository.create(values as TEntity));
    }

    async update({
        record,
        values,
        repository,
    }: UpdateInput<TEntity>): Promise<TEntity> {
        // assigned rather than merged: repository.merge skips null, so a relation could never be cleared
        return repository.save(Object.assign(record, values));
    }

    /** Resolves with how many went; marks them deleted when the entity has a DeleteDateColumn, else forceDelete()s them. */
    async delete(input: DeleteRecordsInput<TEntity>): Promise<number> {
        const { keys, repository } = input;

        if (!repository.metadata.deleteDateColumn)
            return this.forceDelete(input);

        // one primary key column, so every key is of its one type
        return (
            (await repository.softDelete(keys as string[] | number[]))
                .affected ?? 0
        );
    }

    /** Removes soft-deleted records, or any others, for good; resolves with how many went. */
    async forceDelete({
        keys,
        repository,
    }: DeleteRecordsInput<TEntity>): Promise<number> {
        return (
            (await repository.delete(keys as string[] | number[])).affected ?? 0
        );
    }

    /** Brings soft-deleted records back; resolves with how many. */
    async restore({
        keys,
        repository,
    }: DeleteRecordsInput<TEntity>): Promise<number> {
        return (
            (await repository.restore(keys as string[] | number[])).affected ??
            0
        );
    }
}
