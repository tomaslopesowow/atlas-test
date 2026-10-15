import type {
    FieldSchema,
    RecordData,
    ResourceSchema,
    SortDirection,
} from '@repo/admin-contract';
import { Link } from 'react-router';
import { recordHref } from '@/lib/navigation';
import { FieldValue, ShortText } from './FieldValue';
import { SortIcon } from './icons';
import { SelectAll } from './TableControls';

/** Records as rows, sortable given `sort`, each with a checkbox of `form` given one; `flush` lines up with a panel's edges. */
export function RecordTable({
    resource,
    columns,
    records,
    actions,
    sort,
    form,
    compact = false,
    flush = false,
}: {
    resource: ResourceSchema;
    columns: FieldSchema[];
    records: RecordData[];
    actions: (record: RecordData, href: string) => React.ReactNode;
    sort?: {
        field: string;
        direction: SortDirection;
        href: (field: string, direction: SortDirection) => string;
    };
    form?: string;
    compact?: boolean;
    flush?: boolean;
}) {
    const header = (field: FieldSchema) => {
        if (!sort || !field.sortable) return field.label;

        const active = field.name === sort.field;

        return (
            <Link
                to={sort.href(
                    field.name,
                    active && sort.direction === 'asc' ? 'desc' : 'asc',
                )}
                className={`-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-3.5 ${active ? 'text-foreground' : ''}`}
            >
                {field.label}
                <SortIcon direction={active ? sort.direction : undefined} />
            </Link>
        );
    };

    return (
        // relative, so the hidden header text scrolls with the table rather than widening the page
        <div
            className={`relative overflow-x-auto ${flush ? 'border-t' : 'rounded-md border'}`}
        >
            <table
                className={`data-table ${compact ? 'data-table-compact' : ''} ${flush ? '[&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6' : ''}`}
            >
                <thead>
                    <tr>
                        {form && (
                            <th className="w-10 pl-3">
                                <SelectAll form={form} />
                            </th>
                        )}
                        {columns.map((field) => (
                            <th
                                key={field.name}
                                scope="col"
                                aria-sort={
                                    sort && field.name === sort.field
                                        ? sort.direction === 'asc'
                                            ? 'ascending'
                                            : 'descending'
                                        : undefined
                                }
                            >
                                {header(field)}
                            </th>
                        ))}
                        <th>
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => {
                        const href = recordHref(resource.name, record.key);
                        const deleted =
                            resource.deletedAtField &&
                            record.values[resource.deletedAtField] != null;

                        return (
                            <tr key={record.key}>
                                {form && (
                                    <td className="pl-3">
                                        <input
                                            type="checkbox"
                                            name="keys"
                                            value={record.key}
                                            form={form}
                                            className="checkbox"
                                            aria-label={`Select ${record.title}`}
                                        />
                                    </td>
                                )}
                                {columns.map((field) => (
                                    <td key={field.name}>
                                        {field.name === resource.titleField ? (
                                            <span className="flex items-center gap-2">
                                                <Link
                                                    to={href}
                                                    className="link"
                                                    title={record.title}
                                                >
                                                    <ShortText
                                                        text={record.title}
                                                    />
                                                </Link>
                                                {deleted && (
                                                    <span className="badge border-destructive/40 text-destructive">
                                                        Deleted
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <FieldValue
                                                short
                                                field={field}
                                                value={
                                                    record.values[field.name]
                                                }
                                            />
                                        )}
                                    </td>
                                ))}
                                <td className="text-right whitespace-nowrap">
                                    {actions(record, href)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
