import { Action, type ActionHandleInput } from '@repo/admin';
import type { FindOptionsOrder } from 'typeorm';

/** A CSV's columns by header, each reading its cell from a record. */
export type CsvColumns<TEntity> = Record<string, (record: TEntity) => unknown>;

// ponytail: one response holds the whole file, so an export of everything stops here; stream it past this
export const MAX_ROWS = 10_000;

// a spreadsheet runs a cell that starts like a formula, so such a cell is kept as text
const FORMULA = /^[=+\-@\t\r]/;

/** A value as one CSV cell: quoted when it holds a comma, quote or line break. */
export function csvCell(value: unknown): string {
    const text =
        value === null || value === undefined
            ? ''
            : value instanceof Date
              ? value.toISOString()
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
    const safe = FORMULA.test(text) ? `'${text}` : text;

    return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** The records as CSV under the columns' headers; a byte order mark first, so Excel reads it as UTF-8. */
export function toCsv<TEntity>({
    columns,
    records,
}: {
    columns: CsvColumns<TEntity>;
    records: TEntity[];
}): string {
    const read = Object.values(columns);
    const lines = [
        Object.keys(columns).map(csvCell).join(','),
        ...records.map((record) =>
            read.map((cell) => csvCell(cell(record))).join(','),
        ),
    ];

    return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * Downloads the records picked as CSV, as Nova's ExportAsCsv does; with `all`, every record of the
 * resource instead, oldest first and at most MAX_ROWS, with no rows picked. The columns are
 * named one by one, so nothing goes out that was not meant to, e.g. a password hash.
 */
export class ExportAsCsv<TEntity extends object> extends Action<TEntity> {
    override label = 'Export selected as CSV';
    override showOnDetail = false;

    constructor(
        private readonly options: {
            columns: CsvColumns<TEntity>;
            /** Before the date in the file's name; `export` when unset. */
            filename?: string;
            /** Every record of the resource rather than the ones picked. */
            all?: boolean;
        },
    ) {
        super();

        if (options.all) {
            this.name = 'export-all-as-csv';
            this.label = 'Export all as CSV';
            this.standalone = true;
        }
    }

    async handle({ records: picked, repository }: ActionHandleInput<TEntity>) {
        const day = new Date().toISOString().slice(0, 10);
        const records = this.options.all
            ? await repository.find({
                  order: {
                      [repository.metadata.primaryColumns[0]?.propertyName ??
                          'id']: 'ASC',
                  } as FindOptionsOrder<TEntity>,
                  // one past the most, to tell when there were more
                  take: MAX_ROWS + 1,
              })
            : picked;
        const cut = records.length > MAX_ROWS;
        const rows = cut ? records.slice(0, MAX_ROWS) : records;

        return {
            message: cut
                ? `Exported the first ${MAX_ROWS} records; there are more`
                : `Exported ${rows.length} ${rows.length === 1 ? 'record' : 'records'}`,
            download: {
                filename: `${this.options.filename ?? 'export'}-${day}.csv`,
                contentType: 'text/csv; charset=utf-8',
                content: toCsv({
                    columns: this.options.columns,
                    records: rows,
                }),
            },
        };
    }
}

/** Both exports a list offers: the rows picked, and every row. */
export const csvExports = <TEntity extends object>(options: {
    columns: CsvColumns<TEntity>;
    filename?: string;
}) => [new ExportAsCsv(options), new ExportAsCsv({ ...options, all: true })];
