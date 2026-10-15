import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { api, type Me, type Session, SIGNED_OUT, tokenStore } from './api';

interface Auth {
    /** The signed-in user; null when signed out. */
    me: Me | null;
    /** Whether the stored token is still being checked. */
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    /** Loads the user again, after they change their name or avatar. */
    refresh: () => Promise<void>;
    /** Whether their roles grant the permission; the api checks again either way. */
    can: (permission: string) => boolean;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(() => tokenStore.get() !== null);

    const refresh = useCallback(async () => {
        setMe(await api<Me>('/me'));
    }, []);

    useEffect(() => {
        if (tokenStore.get())
            refresh()
                .catch(() => tokenStore.clear())
                .finally(() => setLoading(false));

        const signedOut = () => setMe(null);

        window.addEventListener(SIGNED_OUT, signedOut);

        return () => window.removeEventListener(SIGNED_OUT, signedOut);
    }, [refresh]);

    const start = useCallback((session: Session) => {
        tokenStore.set(session.token);
        setMe(session.user);
    }, []);

    const auth = useMemo<Auth>(
        () => ({
            me,
            loading,
            refresh,
            login: async (email, password) =>
                start(
                    await api<Session>('/auth/login', {
                        method: 'POST',
                        json: { email, password },
                    }),
                ),
            register: async (email, password, name) =>
                start(
                    await api<Session>('/auth/register', {
                        method: 'POST',
                        json: { email, password, name },
                    }),
                ),
            logout: async () => {
                // signed out here even when the api cannot be reached
                await api('/auth/logout', { method: 'POST' }).catch(
                    () => undefined,
                );
                tokenStore.clear();
                setMe(null);
            },
            can: (permission) => me?.permissions.includes(permission) ?? false,
        }),
        [me, loading, refresh, start],
    );

    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
    const auth = useContext(AuthContext);

    if (!auth) throw new Error('useAuth needs an AuthProvider above it');

    return auth;
}

/** The signed-in user, for pages only reached when signed in. */
export function useMe(): Me {
    const { me } = useAuth();

    if (!me) throw new Error('useMe needs a signed-in user');

    return me;
}
