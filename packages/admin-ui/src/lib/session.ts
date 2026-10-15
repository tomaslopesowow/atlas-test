import { readPreference, writePreference } from './preferences';

const SIGNED_OUT = 'admin:signed-out';

export const getToken = () => readPreference('token');

export const setToken = (token: string) => writePreference('token', token);

/** Forgets the token; the app asks to sign in over the page when the API `ended` the session, so nothing typed is lost. */
export function signOut({ ended = false }: { ended?: boolean } = {}) {
    writePreference('token', null);
    window.dispatchEvent(new CustomEvent(SIGNED_OUT, { detail: ended }));
}

/** Calls back whenever the session ends, saying whether the API ended it; returns the unsubscribe. */
export function onSignedOut(listener: (ended: boolean) => void) {
    const heard = (event: Event) =>
        listener((event as CustomEvent<boolean>).detail);

    window.addEventListener(SIGNED_OUT, heard);

    return () => window.removeEventListener(SIGNED_OUT, heard);
}
