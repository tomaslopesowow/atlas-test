import type { ResourceSchema, SortDirection } from '@repo/admin-contract';
import {
    And,
    type FindOptionsWhere,
    ILike,
    LessThan,
    MoreThanOrEqual,
} from 'typeorm';
import type { BaseFilter } from '../filters/filter.js';
import type {
    Query,
    ResolvedFilter,
    ResolvedResource,
} from '../types/types.js';
import { DAY, dayStart } from '../utils.js';

/** A query string value, trimmed; empty for anything but text. */
export const text = (value: unknown) =>
    typeof value === 'string' ? value.trim() : '';

// past this, a page is no page any list has, and a bigger OFFSET is one Postgres refuses
const MAX_PAGE = 1_000_000;

/** A page number from a query string: a whole number from 1, or 1. */
export const pageOf = (value: unknown) => {
    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0
        ? Math.min(number, MAX_PAGE)
        : 1;
};

// a % or _ in what is searched for means itself, not a wildcard
const escapeLike = (search: string) => search.replace(/[\\%_]/g, '\\$&');

/** Each column as one condition of an OR, matching text that contains the search, wildcards and all. */
export const containing = (columns: string[], search: string) =>
    columns.map((name) => ({ [name]: ILike(`%${escapeLike(search)}%`) }));

/** The page, its size and its order a query string asks for, or the resource's defaults for what it does not allow. */
export function paging(schema: ResourceSchema, query: Query) {
    const perPage = schema.perPageOptions.includes(Number(query.perPage))
        ? Number(query.perPage)
        : schema.perPage;
    const sortable = schema.fields.find(
        ({ name, sortable }) => sortable && name === query.sort,
    );
    const direction: SortDirection =
        query.direction === 'asc' || query.direction === 'desc'
            ? query.direction
            : sortable
              ? 'asc'
              : schema.defaultSort.direction;

    return {
        page: pageOf(query.page),
        perPage,
        sort: sortable?.name ?? schema.defaultSort.field,
        direction,
        search: text(query.search),
    };
}

const dayAfter = (date: string) =>
    new Date((dayStart(date) as number) + DAY).toISOString();

// a day a calendar has, before the last one Postgres takes the day after of; ignored otherwise
const day = (value: unknown) => {
    const date = text(value);

    return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        dayStart(date) !== undefined &&
        date < '9999-12-31'
        ? date
        : undefined;
};

// what a filter's apply() gets for the query string, or undefined for nothing it can take, which is ignored
function filterValue({ schema }: ResolvedFilter, query: Query): unknown {
    const key = `filter.${schema.name}`;

    if (schema.type === 'dateRange') {
        const from = day(query[`${key}.from`]);
        const to = day(query[`${key}.to`]);
        // ISO strings, not Dates, so a date column compares them by their day and a datetime by the moment
        const start = from && MoreThanOrEqual(`${from}T00:00:00.000Z`);
        const end = to && LessThan(dayAfter(to));

        return start && end ? And(start, end) : start || end || undefined;
    }

    const value = text(query[key]);

    if (schema.type === 'boolean')
        return value === 'true' ? true : value === 'false' ? false : undefined;

    return schema.options?.find((option) => String(option.value) === value)
        ?.value;
}

/** The conditions of the filters the query string sets: `filter.status=draft`, `filter.created-at.from=2026-10-01`. */
export function filterConditions(
    resolved: ResolvedResource,
    query: Query,
): FindOptionsWhere<object> {
    const where: FindOptionsWhere<object> = {};

    for (const resolvedFilter of resolved.filters) {
        const value = filterValue(resolvedFilter, query);

        if (value !== undefined)
            Object.assign(
                where,
                (resolvedFilter.filter as BaseFilter<object, unknown>).apply({
                    value,
                }),
            );
    }

    return where;
}

/** The where of a list: its scope and filters, and when searching, once per searched column. */
export function listWhere(
    resolved: ResolvedResource,
    { search, base }: { search: string; base: FindOptionsWhere<object> },
): FindOptionsWhere<object> | FindOptionsWhere<object>[] | undefined {
    if (search && resolved.searchColumns.length)
        return containing(resolved.searchColumns, search).map((match) => ({
            ...base,
            ...match,
        }));

    return Object.keys(base).length ? base : undefined;
}
