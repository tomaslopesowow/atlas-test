import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';
import { SkeletonRows } from '@/components/Skeleton';
import type { Reload } from './navigation';

// how many loads are under way, for the bar that says the page is busy
let loading = 0;
const listeners = new Set<() => void>();
const busy = (by: number) => {
    loading += by;
    for (const listener of listeners) listener();
};

export const useBusy = () =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => loading > 0,
    );

interface Loaded<T> {
    data?: T;
    error?: unknown;
}

/** Data for a page, loaded again when `deps` change or an action reloads it; the last data stays while the next loads. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): Loaded<T> {
    const reload = (useLocation().state as Reload | null)?.reload;
    const [state, setState] = useState<Loaded<T>>({});

    // biome-ignore lint/correctness/useExhaustiveDependencies: the caller names what the load reads
    useEffect(() => {
        let current = true;

        busy(1);
        load()
            .then(
                (data) => current && setState({ data }),
                (error: unknown) => current && setState({ error }),
            )
            .finally(() => busy(-1));

        // a newer load, or leaving the page, makes this answer moot
        return () => {
            current = false;
        };
    }, [...deps, reload]);

    return state;
}

/** The loaded data to a render, `fallback` while it first loads, and its error to the boundary above. */
export function Await<T>({
    state,
    children,
    fallback = <SkeletonRows />,
}: {
    state: Loaded<T>;
    children: (data: T) => React.ReactNode;
    fallback?: React.ReactNode;
}) {
    if (state.error) throw state.error;

    return state.data === undefined ? fallback : children(state.data);
}

/** The browser tab's title, as `Posts · Admin`. */
export function useTitle(title: string | undefined) {
    useEffect(() => {
        document.title = title ? `${title} · Admin` : 'Admin';
    }, [title]);
}
