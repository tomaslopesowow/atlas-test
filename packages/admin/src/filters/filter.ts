import type { FilterType, SelectOption } from '@repo/admin-contract';
import type { FindOperator, FindOptionsWhere } from 'typeorm';
import type { FilterInput } from '../types/types.js';

/** What every filter has; a resource's filters extend Filter, BooleanFilter or DateFilter. */
export abstract class BaseFilter<TEntity extends object, TValue> {
    /** Its key in the query string; the class name in kebab case, without Filter, when unset. */
    name?: string;
    label?: string;

    abstract readonly type: FilterType;

    /** The condition the records listed meet for the value picked. */
    abstract apply(input: FilterInput<TValue>): FindOptionsWhere<TEntity>;
}

/** Records of the option picked, e.g. posts of a status: `apply({ value })` gets the option's value. */
export abstract class Filter<
    TEntity extends object = object,
> extends BaseFilter<TEntity, SelectOption['value']> {
    readonly type = 'select';

    abstract options(): SelectOption[];
}

/** Records for which a yes or no holds, e.g. featured posts. */
export abstract class BooleanFilter<
    TEntity extends object = object,
> extends BaseFilter<TEntity, boolean> {
    readonly type = 'boolean';
}

/**
 * Records within the days picked, both included, in UTC: `apply({ value })` gets a condition to
 * put on a date or datetime column, e.g. `{ createdAt: value }`; typed never, so it fits any column.
 */
export abstract class DateFilter<
    TEntity extends object = object,
> extends BaseFilter<TEntity, FindOperator<never>> {
    readonly type = 'dateRange';
}

/** A field's own filter, from `.filterable()`: records whose column is the value picked, or within the days. */
export class FieldFilter extends BaseFilter<object, unknown> {
    readonly type: FilterType;
    private readonly property: string;
    private readonly choices: SelectOption[];

    constructor({
        name,
        property,
        label,
        type,
        choices = [],
    }: {
        name: string;
        /** The column it compares. */
        property: string;
        label: string;
        type: FilterType;
        choices?: SelectOption[];
    }) {
        super();
        this.name = name;
        this.property = property;
        this.label = label;
        this.type = type;
        this.choices = choices;
    }

    options(): SelectOption[] {
        return this.choices;
    }

    apply({ value }: FilterInput<unknown>): FindOptionsWhere<object> {
        return { [this.property]: value };
    }
}

export type AnyFilter<TEntity extends object = object> =
    | Filter<TEntity>
    | BooleanFilter<TEntity>
    | DateFilter<TEntity>;
