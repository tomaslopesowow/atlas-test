import type { ActivityEntry, ActivityEvent } from '@repo/admin-contract';
import { Link } from 'react-router';
import { formatDateTime } from '@/lib/format';
import { recordHref } from '@/lib/navigation';
import { useSchema } from '@/lib/schema';
import { Empty } from './Panel';

const EVENTS: Record<ActivityEvent, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    restored: 'Restored',
    forceDeleted: 'Deleted for good',
    attached: 'Attached',
    detached: 'Detached',
    action: 'Ran',
};

const TONES: Partial<Record<ActivityEvent, string>> = {
    created: 'border-success/40 text-success',
    restored: 'border-success/40 text-success',
    deleted: 'border-destructive/40 text-destructive',
    forceDeleted: 'border-destructive/40 text-destructive',
};

const short = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object')
        return 'title' in value
            ? String((value as { title: unknown }).title)
            : JSON.stringify(value);

    return String(value);
};

const isChange = (value: unknown): value is { from: unknown; to: unknown } =>
    typeof value === 'object' &&
    value !== null &&
    'from' in value &&
    'to' in value;

// what a change touched, in a line or two: an update's from and to, the titles linked, an action's values
function Changes({ entry }: { entry: ActivityEntry }) {
    const changes = Object.entries(entry.changes);

    if (
        changes.length === 0 ||
        entry.event === 'created' ||
        entry.event === 'deleted' ||
        entry.event === 'forceDeleted'
    )
        return null;

    return (
        <ul className="space-y-0.5 text-sm text-muted-foreground [:not(:empty)+&]:mt-1.5">
            {changes.map(([field, change]) => (
                <li key={field} className="break-words">
                    <span className="font-medium text-foreground">{field}</span>{' '}
                    {entry.event === 'updated' && isChange(change) ? (
                        <>
                            <span className="line-through">
                                {short(change.from)}
                            </span>{' '}
                            → <span>{short(change.to)}</span>
                        </>
                    ) : Array.isArray(change) ? (
                        change.join(', ')
                    ) : (
                        short(change)
                    )}
                </li>
            ))}
        </ul>
    );
}

function Actor({ actor }: { actor: ActivityEntry['actor'] }) {
    if (!actor) return <span className="text-muted-foreground">—</span>;

    return actor.resource ? (
        <Link
            to={recordHref(actor.resource, actor.key)}
            className="link truncate"
        >
            {actor.title}
        </Link>
    ) : (
        <span className="truncate">{actor.title}</span>
    );
}

/** Changes newest first; `showRecord` also names and links each one's record, as the log of every resource does. */
export function ActivityList({
    entries,
    showRecord = false,
}: {
    entries: ActivityEntry[];
    showRecord?: boolean;
}) {
    const { resources } = useSchema();
    const resourceOf = (name: string) =>
        resources.find((resource) => resource.name === name);

    if (entries.length === 0) return <Empty>No changes yet.</Empty>;

    const columns = showRecord
        ? // every column fixed but the record's, so each row lines up with the header whatever its date
          'sm:grid-cols-[7.5rem_8rem_minmax(0,1fr)_9rem_9rem]'
        : 'sm:grid-cols-[7.5rem_minmax(0,1fr)_9rem_9rem]';
    const row = `grid gap-x-4 gap-y-1 px-6 ${columns}`;

    return (
        <div className="border-t">
            <div
                className={`${row} hidden border-b py-2 text-xs font-medium text-muted-foreground sm:grid`}
                aria-hidden
            >
                <span>Event</span>
                {showRecord && (
                    <>
                        <span>Type</span>
                        <span>Record</span>
                    </>
                )}
                {!showRecord && <span>Changes</span>}
                <span>By</span>
                <span className="text-right">When</span>
            </div>
            <ol className="divide-y">
                {entries.map((entry) => (
                    <li key={entry.id} className={`${row} items-start py-3`}>
                        <span className="flex flex-wrap items-center gap-1.5">
                            <span
                                className={`badge ${TONES[entry.event] ?? ''}`}
                            >
                                {EVENTS[entry.event]}
                            </span>
                        </span>
                        {showRecord && (
                            <span className="text-muted-foreground">
                                {resourceOf(entry.resource)?.singularLabel ??
                                    entry.resource}
                            </span>
                        )}
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* a standalone action is logged under no record */}
                                {showRecord && entry.recordKey && (
                                    <Link
                                        to={recordHref(
                                            entry.resource,
                                            entry.recordKey,
                                        )}
                                        className="link truncate"
                                    >
                                        {entry.recordTitle}
                                    </Link>
                                )}
                                {entry.action && (
                                    <span className="badge bg-secondary">
                                        {resourceOf(
                                            entry.resource,
                                        )?.actions.find(
                                            ({ name }) => name === entry.action,
                                        )?.label ?? entry.action}
                                    </span>
                                )}
                            </div>
                            <Changes entry={entry} />
                        </div>
                        <Actor actor={entry.actor} />
                        <time
                            className="text-xs text-muted-foreground sm:text-right"
                            dateTime={entry.createdAt}
                        >
                            {formatDateTime(entry.createdAt)}
                        </time>
                    </li>
                ))}
            </ol>
        </div>
    );
}
