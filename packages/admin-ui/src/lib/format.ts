import type { FieldSchema } from '@repo/admin-contract';
import { relatedTitle } from './form-values.ts';

const dateTime = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

/** A moment as `9 Oct 2026, 14:30`; the value as it is when no date can be read from it. */
export function formatDateTime(value: unknown): string {
    const date = new Date(String(value));

    return Number.isNaN(date.getTime()) ? String(value) : dateTime.format(date);
}

const date = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
});

/** A calendar day such as `2026-10-09` as `9 Oct 2026`; the value as it is when it is no day. */
export function formatDay(value: unknown): string {
    const day = new Date(`${value}T00:00:00Z`);

    return Number.isNaN(day.getTime()) ? String(value) : date.format(day);
}

/** A value as text for a table cell or a detail row; null when there is none. */
export function formatValue(field: FieldSchema, value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;

    switch (field.type) {
        case 'boolean':
            return value ? 'Yes' : 'No';
        case 'datetime':
            return formatDateTime(value);
        case 'date':
            return formatDay(value);
        case 'select':
            return (
                field.options?.find((option) => option.value === value)
                    ?.label ?? String(value)
            );
        case 'json':
            return JSON.stringify(value, null, 2);
        case 'belongsTo':
            return relatedTitle(value);
        case 'custom':
            return typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
        default:
            return String(value);
    }
}

/** The first letters of a name's first two words, as an avatar shows them. */
export const initials = (title: string) =>
    title
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');

/** The text cut at a word before `limit` characters, with an ellipsis, or whole when it fits. */
export function truncate(text: string, limit: number): string {
    if (text.length <= limit) return text;

    const cut = text.slice(0, limit);
    const space = cut.lastIndexOf(' ');

    return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
