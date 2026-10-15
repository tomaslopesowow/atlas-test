import type { ColumnMetadata } from '../types/types.js';

/** What ILIKE can search; uuid and enum columns cannot. */
const TEXT = new Set([
    'character varying',
    'varchar',
    'character',
    'char',
    'citext',
    'text',
]);

/** A column's type as Postgres names it, also for one declared by its JavaScript class. */
export const columnType = (column: ColumnMetadata): string => {
    if (typeof column.type === 'string') return column.type;
    if (column.type === Number) return 'integer';
    if (column.type === Boolean) return 'boolean';
    if (column.type === Date) return 'timestamp';
    if (column.type === String) return 'character varying';

    return 'json';
};

/** Whether ILIKE can search the column. */
export const isText = (column: ColumnMetadata | undefined): boolean =>
    column !== undefined && TEXT.has(columnType(column));
