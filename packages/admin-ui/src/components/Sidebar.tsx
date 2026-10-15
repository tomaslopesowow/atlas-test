import type { ActivityActor } from '@repo/admin-contract';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { endSession, getMe } from '@/lib/api';
import { initials } from '@/lib/format';
import { recordHref, resourceHref } from '@/lib/navigation';
import { useSchema } from '@/lib/schema';
import {
    HistoryIcon,
    HomeIcon,
    LogOutIcon,
    SearchIcon,
    TableIcon,
} from './icons';
import { Tooltip } from './Tooltip';

/** Beside the page from md up; below that, off screen until the menu button slides it in. */
export function Sidebar({
    open,
    onToggle,
}: {
    open: boolean;
    onToggle: () => void;
}) {
    const { resources } = useSchema();

    useEffect(() => {
        if (!open) return;

        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onToggle();
        };

        document.addEventListener('keydown', close);

        return () => document.removeEventListener('keydown', close);
    }, [open, onToggle]);

    return (
        <>
            <aside
                id="sidebar"
                // under the top bar on a narrow screen, so its menu button stays there to close it,
                // and invisible as it slides away, so its links leave the tab order too
                className={`fixed top-12 bottom-0 left-0 z-50 w-64 shrink-0 overflow-y-auto border-r bg-sidebar transition-[translate,visibility] duration-200 md:sticky md:top-0 md:bottom-auto md:z-auto md:h-screen md:translate-x-0 md:visible ${open ? 'translate-x-0' : 'invisible -translate-x-full'}`}
            >
                <div className="flex min-h-full flex-col">
                    {/* as tall as the top bar, so the two borders meet in one line */}
                    <Link
                        to="/"
                        className="flex h-12 shrink-0 items-center border-b px-5 font-semibold"
                    >
                        Atlas Administrator
                    </Link>
                    <div className="p-3">
                        <SearchBox />
                    </div>
                    <nav aria-label="Main" className="grid gap-5 px-3 pb-3">
                        <Group label="Overview">
                            <NavItem to="/" icon={<HomeIcon />}>
                                Dashboard
                            </NavItem>
                            <NavItem to="/activity" icon={<HistoryIcon />}>
                                Activity
                            </NavItem>
                        </Group>
                        {resources.length > 0 && (
                            <Group label="Resources">
                                {resources.map((resource) => (
                                    <NavItem
                                        key={resource.name}
                                        to={resourceHref(resource.name)}
                                        icon={<TableIcon />}
                                    >
                                        {resource.label}
                                    </NavItem>
                                ))}
                            </Group>
                        )}
                    </nav>
                    <SignedIn />
                </div>
            </aside>
            {open && (
                <button
                    type="button"
                    className="fixed inset-x-0 top-12 bottom-0 z-40 bg-black/50 md:hidden"
                    aria-label="Close menu"
                    onClick={onToggle}
                />
            )}
        </>
    );
}

function Group({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-0.5">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                {label}
            </p>
            {children}
        </div>
    );
}

// the current page's link marked; the dashboard's on its own page only
function NavItem({
    to,
    icon,
    children,
}: {
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <NavLink
            to={to}
            end={to === '/'}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground aria-[current]:bg-sidebar-accent aria-[current]:font-medium aria-[current]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
        >
            {icon}
            <span className="truncate">{children}</span>
        </NavLink>
    );
}

/** Search across every resource; `/` anywhere but in a field jumps to it. */
function SearchBox() {
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focus = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;

            if (
                event.key !== '/' ||
                target.closest('input, textarea, select, [contenteditable]')
            )
                return;

            event.preventDefault();
            input.current?.focus();
        };

        document.addEventListener('keydown', focus);

        return () => document.removeEventListener('keydown', focus);
    }, []);

    return (
        <search>
            <form action="/search" className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">
                    <SearchIcon />
                </span>
                <input
                    ref={input}
                    type="search"
                    name="q"
                    placeholder="Search..."
                    aria-label="Search everything"
                    aria-keyshortcuts="/"
                    className="input h-8 bg-background pr-8 pl-8"
                />
                <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                    /
                </kbd>
            </form>
        </search>
    );
}

/** Who the panel is signed in as, and the way out; at the bottom however long the list. */
function SignedIn() {
    const [user, setUser] = useState<ActivityActor | null>(null);

    useEffect(() => {
        getMe().then(
            (me) => setUser(me.user),
            () => {},
        );
    }, []);

    return (
        <div className="mt-auto flex items-center gap-1 border-t px-3 py-2">
            {user && (
                <Link
                    to={
                        user.resource
                            ? recordHref(user.resource, user.key)
                            : '/'
                    }
                    className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-sidebar-accent"
                    title="Signed in as this account"
                >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[10px] font-medium">
                        {initials(user.title)}
                    </span>
                    <span className="truncate font-medium">{user.title}</span>
                </Link>
            )}
            <Tooltip content="Sign out" align="end">
                <button
                    type="button"
                    className={`btn btn-ghost ${user ? 'btn-icon' : 'w-full justify-start'}`}
                    aria-label="Sign out"
                    onClick={() => endSession()}
                >
                    <LogOutIcon />
                    {!user && 'Sign out'}
                </button>
            </Tooltip>
        </div>
    );
}
