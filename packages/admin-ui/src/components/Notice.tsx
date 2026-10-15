import { useLocation } from 'react-router';
import type { Said } from '@/lib/navigation';

const NOTICES: Record<NonNullable<Said['notice']>, string> = {
    created: 'Created.',
    updated: 'Saved.',
    deleted: 'Deleted.',
    attached: 'Attached.',
    detached: 'Detached.',
    restored: 'Restored.',
};

export function ErrorAlert({ children }: { children: React.ReactNode }) {
    return (
        <p className="alert alert-error" role="alert">
            {children}
        </p>
    );
}

/** What the last action did, or why it failed, from the navigation's state: never the url, which anyone could write. */
export function Notice() {
    const { notice, message, error } = (useLocation().state ?? {}) as Said;

    if (error) return <ErrorAlert>{error}</ErrorAlert>;

    const text = message ?? (notice && NOTICES[notice]);

    return text ? (
        <p className="alert" role="status">
            {text}
        </p>
    ) : null;
}
