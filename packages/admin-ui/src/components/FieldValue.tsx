import type {
    FieldSchema,
    FileValue,
    RelatedRecord,
} from '@repo/admin-contract';
import { Link } from 'react-router';
import { formatValue, truncate } from '@/lib/format';
import { recordHref } from '@/lib/navigation';
import { CUSTOM_FIELDS } from './custom-fields';

const NONE = <span className="text-muted-foreground">—</span>;

/** A text cut for a table cell: shorter on a small screen, which only CSS knows of, so both are sent. */
export function ShortText({ text }: { text: string }) {
    return (
        <>
            <span className="sm:hidden">{truncate(text, 50)}</span>
            <span className="hidden sm:inline">{truncate(text, 80)}</span>
        </>
    );
}

export function FieldValue({
    field,
    value,
    short = false,
}: {
    field: FieldSchema;
    value: unknown;
    /** In a table cell, which cuts long text short. */
    short?: boolean;
}) {
    if (field.type === 'file') {
        const file = value as FileValue | null;

        if (!file?.url)
            return file ? (
                <span className="text-muted-foreground">
                    {String(file.value)}
                </span>
            ) : (
                NONE
            );

        return file.image ? (
            <a href={file.url} target="_blank" rel="noreferrer">
                <img
                    src={file.url}
                    alt={file.name ?? ''}
                    className="size-10 rounded-md border object-cover"
                />
            </a>
        ) : (
            <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="link"
            >
                {file.name ?? file.url}
            </a>
        );
    }

    if (field.type === 'custom') {
        const Custom = field.component
            ? CUSTOM_FIELDS[field.component]?.Value
            : undefined;

        if (Custom) return <Custom field={field} value={value} />;
    }

    const text = formatValue(field, value);

    if (text === null) return NONE;
    if (field.type === 'json')
        return (
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                {text}
            </pre>
        );
    // a table cell cuts text short, with all of it on hover
    if (short && (field.type === 'text' || field.type === 'textarea'))
        return (
            <span title={text}>
                <ShortText text={text} />
            </span>
        );
    if (field.type === 'textarea')
        return <span className="whitespace-pre-wrap">{text}</span>;
    if (field.type === 'boolean' || field.type === 'select')
        return <span className="badge">{text}</span>;
    // a date in a row on one line, so the row stays one line high
    if (short && (field.type === 'datetime' || field.type === 'date'))
        return <span className="whitespace-nowrap">{text}</span>;
    if (field.type === 'email')
        return (
            <a href={`mailto:${text}`} className="link">
                {text}
            </a>
        );
    if (field.type === 'belongsTo' && field.relation)
        return (
            <Link
                to={recordHref(
                    field.relation.resource,
                    (value as RelatedRecord).key,
                )}
                className="link"
            >
                {text}
            </Link>
        );

    return <>{text}</>;
}
