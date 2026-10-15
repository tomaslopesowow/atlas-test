import type { AdminSchema } from '@repo/admin-contract';
import { Component, useEffect, useState } from 'react';
import {
    Route,
    Routes,
    useLocation,
    useNavigate,
    useNavigationType,
    useParams,
} from 'react-router';
import { DismissLayer } from './components/Dismiss';
import { BellIcon, MenuIcon } from './components/icons';
import { ErrorAlert } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { Tooltip } from './components/Tooltip';
import { ApiError, getSchema, NotFound } from './lib/api';
import { useBusy } from './lib/load';
import { type Reload, setNavigator } from './lib/navigation';
import { setSchema } from './lib/schema';
import { getToken, onSignedOut, signOut } from './lib/session';
import { Activity } from './pages/Activity';
import { Dashboard } from './pages/Dashboard';
import { EditRecord } from './pages/EditRecord';
import { NewRecord } from './pages/NewRecord';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResourceDetail } from './pages/ResourceDetail';
import { ResourceIndex } from './pages/ResourceIndex';
import { RunAction } from './pages/RunAction';
import { Search } from './pages/Search';
import { SignIn } from './pages/SignIn';

/** The sign-in until there is a token, then the page; a session the API ends signs in over the page, keeping what was typed. */
export function App() {
    const [signedIn, setSignedIn] = useState(() => getToken() !== null);
    const [schema, setLoaded] = useState<AdminSchema | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [refused, setRefused] = useState(false);

    useEffect(
        () =>
            onSignedOut((ended) => {
                setSignedIn(false);
                // signed out on purpose: nothing of the panel stays behind the sign-in
                if (!ended) setLoaded(null);
            }),
        [],
    );

    useEffect(() => {
        if (!signedIn) return;

        getSchema().then(
            (loaded) => {
                setSchema(loaded);
                setLoaded(loaded);
            },
            (failed: unknown) => {
                // a 401 signed out already
                if (failed instanceof ApiError && failed.status === 401) return;
                if (failed instanceof ApiError && failed.status === 403) {
                    setRefused(true);
                    signOut();
                } else setError(failed);
            },
        );
    }, [signedIn]);

    const signIn = (
        <SignIn
            notice={
                refused
                    ? 'This account may not use the admin panel.'
                    : schema
                      ? 'The session ended. Sign in to carry on where you were.'
                      : null
            }
            onSignedIn={() => {
                setRefused(false);
                setSignedIn(true);
            }}
        />
    );

    if (!signedIn && !schema) return signIn;
    if (error)
        return (
            <main className="p-8">
                <Failure error={error} retry={() => window.location.reload()} />
            </main>
        );
    if (!schema) return null;

    return (
        <>
            <Layout inert={!signedIn} />
            {!signedIn && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm">
                    {signIn}
                </div>
            )}
        </>
    );
}

// a page shows afresh for another resource or record, rather than with the last one's data while it loads
function Fresh({ page: Page }: { page: () => React.ReactNode }) {
    const { resource, key } = useParams();

    return <Page key={`${resource}/${key}`} />;
}

function Layout({ inert }: { inert: boolean }) {
    const navigate = useNavigate();
    const { pathname, key, state } = useLocation();
    const navigation = useNavigationType();
    const reload = (state as Reload | null)?.reload;
    const [announced, setAnnounced] = useState('');
    // the narrow screen's menu, open on the page it was opened on only, so following one of its links closes it
    const [menuOn, setMenuOn] = useState<string | null>(null);
    const menuOpen = menuOn === pathname;
    const toggleMenu = () => setMenuOn(menuOpen ? null : pathname);

    useEffect(() => {
        setNavigator(navigate);
    }, [navigate]);

    // a new page, or an action's result, starts at the top; another query of the page keeps its place, Back and Forward the browser's
    // biome-ignore lint/correctness/useExhaustiveDependencies: on the path and an action's reload only
    useEffect(() => {
        if (navigation !== 'POP') window.scrollTo(0, 0);
    }, [pathname, reload]);

    // a screen reader hears the page it is on, as on a page load, once its title is set
    // biome-ignore lint/correctness/useExhaustiveDependencies: on each navigation
    useEffect(() => {
        const timer = setTimeout(() => setAnnounced(document.title), 500);

        return () => clearTimeout(timer);
    }, [key]);

    // a GET form, such as the search or a filter's, navigates in the app rather than loading a page
    useEffect(() => {
        const submit = (event: SubmitEvent) => {
            const form = event.target as HTMLFormElement;

            if (event.defaultPrevented || form.method !== 'get') return;

            event.preventDefault();

            const query = new URLSearchParams();

            for (const [name, value] of new FormData(form, event.submitter))
                if (typeof value === 'string') query.append(name, value);

            navigate(`${form.getAttribute('action') ?? pathname}?${query}`);
        };

        document.addEventListener('submit', submit);

        return () => document.removeEventListener('submit', submit);
    }, [navigate, pathname]);

    return (
        <div className="flex min-h-screen" inert={inert}>
            <Sidebar open={menuOpen} onToggle={toggleMenu} />
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-40 flex h-12 items-center gap-1 border-b bg-background/80 px-4 backdrop-blur md:px-8">
                    <button
                        type="button"
                        className="btn btn-ghost btn-icon md:hidden"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        aria-controls="sidebar"
                        onClick={toggleMenu}
                    >
                        <MenuIcon />
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                        {/* ponytail: a placeholder until notifications exist */}
                        <Tooltip
                            content="No notifications yet"
                            side="bottom"
                            align="end"
                        >
                            <button
                                type="button"
                                className="btn btn-ghost btn-icon"
                                aria-label="Notifications"
                            >
                                <BellIcon />
                            </button>
                        </Tooltip>
                        <Tooltip content="Appearance" side="bottom" align="end">
                            <ThemeToggle />
                        </Tooltip>
                    </div>
                </header>
                <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pt-6">
                    <Boundary at={key}>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/activity" element={<Activity />} />
                            <Route path="/search" element={<Search />} />
                            <Route
                                path="/resources/:resource"
                                element={<Fresh page={ResourceIndex} />}
                            />
                            <Route
                                path="/resources/:resource/new"
                                element={<Fresh page={NewRecord} />}
                            />
                            <Route
                                path="/resources/:resource/run"
                                element={<Fresh page={RunAction} />}
                            />
                            <Route
                                path="/resources/:resource/:key"
                                element={<Fresh page={ResourceDetail} />}
                            />
                            <Route
                                path="/resources/:resource/:key/edit"
                                element={<Fresh page={EditRecord} />}
                            />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Boundary>
                </main>
            </div>
            <DismissLayer />
            <LoadingBar />
            <p className="sr-only" aria-live="polite">
                {announced}
            </p>
        </div>
    );
}

/** A bar across the top while data loads, shown only once a load takes long enough to notice. */
function LoadingBar() {
    const busy = useBusy();

    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity ${busy ? 'opacity-100 delay-300' : 'opacity-0'}`}
        >
            <div className="loading-bar h-full w-1/3 bg-chart" />
        </div>
    );
}

class Boundary extends Component<
    { at: string; children: React.ReactNode },
    { error: unknown }
> {
    state = { error: null as unknown };

    static getDerivedStateFromError(error: unknown) {
        return { error };
    }

    // going anywhere, even back, tries the page again
    componentDidUpdate(before: { at: string }) {
        if (before.at !== this.props.at && this.state.error !== null)
            this.setState({ error: null });
    }

    render() {
        const { error } = this.state;

        if (error === null) return this.props.children;
        if (error instanceof NotFound) return <NotFoundPage />;

        return (
            <Failure
                error={error}
                retry={() => this.setState({ error: null })}
            />
        );
    }
}

function Failure({ error, retry }: { error: unknown; retry: () => void }) {
    return (
        <>
            <PageHeader title="Something went wrong" />
            <ErrorAlert>
                {(error instanceof Error && error.message) ||
                    'The API could not be reached.'}
            </ErrorAlert>
            <button type="button" className="btn btn-outline" onClick={retry}>
                Try again
            </button>
        </>
    );
}
