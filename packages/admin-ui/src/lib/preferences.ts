import { useSyncExternalStore } from 'react';

const CHANGED = 'admin:preference';

/** A choice kept in this browser, e.g. the theme; null when none was made, or the browser keeps nothing. */
export function readPreference(name: string): string | null {
    try {
        return localStorage.getItem(`admin.${name}`);
    } catch {
        return null;
    }
}

/** Keeps the choice, or forgets it for null, re-rendering every component that reads it. */
export function writePreference(name: string, value: string | null) {
    try {
        if (value === null) localStorage.removeItem(`admin.${name}`);
        else localStorage.setItem(`admin.${name}`, value);
    } catch {}
    window.dispatchEvent(new Event(CHANGED));
}

const subscribe = (listener: () => void) => {
    window.addEventListener(CHANGED, listener);

    return () => window.removeEventListener(CHANGED, listener);
};

export const usePreference = (name: string) =>
    useSyncExternalStore(subscribe, () => readPreference(name));
