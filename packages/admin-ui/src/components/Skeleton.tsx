export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
    return (
        <span
            className={`block animate-pulse rounded-md bg-muted ${className}`}
            aria-hidden="true"
        />
    );
}

/** Rows of a list or table still loading, said once to a screen reader. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
    return (
        <div className="grid gap-3 py-2" role="status">
            <span className="sr-only">Loading…</span>
            {[...Array(rows).keys()].map((row) => (
                <Skeleton
                    key={row}
                    className={`h-4 ${row % 2 ? 'w-4/5' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div className="space-y-6" role="status">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-8 w-64" />
            <div className="card grid gap-4 p-6">
                {[...Array(6).keys()].map((row) => (
                    <Skeleton key={row} className="h-4 w-full" />
                ))}
            </div>
        </div>
    );
}
