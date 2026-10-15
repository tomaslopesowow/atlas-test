import { useMemo } from 'react';
import { type NavigateOptions, useSearchParams } from 'react-router';

/** The query string as one value a name, the empty ones left out. */
export function useQuery(): Record<string, string | undefined> {
    const [params] = useSearchParams();

    return useMemo(
        () =>
            Object.fromEntries(
                [...params.keys()].flatMap((name) => {
                    const value = params.get(name);

                    return value ? [[name, value]] : [];
                }),
            ),
        [params],
    );
}

/** The given names of the query, the absent ones left out. */
export function pick<T extends string>(
    query: Record<string, string | undefined>,
    names: readonly T[],
): Partial<Record<T, string>> {
    return Object.fromEntries(
        names.flatMap((name) => (query[name] ? [[name, query[name]]] : [])),
    ) as Partial<Record<T, string>>;
}

/** The query string with some parameters changed, or removed when given undefined. */
export function withQuery(
    current: Record<string, string | undefined>,
    changes: Record<string, string | number | undefined>,
): string {
    const query = new URLSearchParams();

    for (const [name, value] of Object.entries({ ...current, ...changes }))
        if (value !== undefined && value !== '') query.set(name, String(value));

    // never empty: an empty href is the current url, so dropping the last parameter would do nothing
    return `?${query}`;
}

/** A page number from the query string: a whole number from 1, or 1. */
export const pageOf = (value: string | undefined) =>
    Math.max(1, Math.floor(Number(value)) || 1);

/** A path of this app, or undefined: `//host` and `/\\host` lead browsers to another site. */
export const safePath = (value: unknown): string | undefined =>
    typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : undefined;

export const resourceHref = (resource: string) => `/resources/${resource}`;

export const recordHref = (resource: string, key: string | number) =>
    `${resourceHref(resource)}/${encodeURIComponent(key)}`;

/** Where an action asks for its fields, to run on these records and go back to `from`. */
export function runHref(
    resource: string,
    action: string,
    keys: string[],
    from: string,
) {
    const query = new URLSearchParams({ action, from });

    for (const key of keys) query.append('keys', key);

    return `${resourceHref(resource)}/run?${query}`;
}

/** What the page an action lands on says of it: what was done, what an action said, or why it was refused. */
export interface Said {
    notice?:
        | 'created'
        | 'updated'
        | 'deleted'
        | 'attached'
        | 'detached'
        | 'restored';
    message?: string;
    error?: string;
}

/** The state of a navigation after a change: the page there loads afresh, from the top. */
export interface Reload extends Said {
    reload: number;
}

// set by the layout once the router is up; a full page load until then
let navigateTo = (to: string, _options: NavigateOptions) =>
    window.location.assign(
        `${import.meta.env.BASE_URL.replace(/\/$/, '')}${to}`,
    );

export const setNavigator = (
    navigate: (to: string, options: NavigateOptions) => void,
) => {
    navigateTo = navigate;
};

/** Goes somewhere once an action is done, the page there reloading its data and saying what was done. */
export const go = (to: string, said: Said = {}) =>
    navigateTo(to, { state: { reload: Date.now(), ...said } satisfies Reload });
