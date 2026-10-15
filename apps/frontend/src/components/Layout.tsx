import { LogOutIcon, UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '../api';
import { useAuth, useMe } from '../auth';
import { UserAvatar } from './UserAvatar';

const POLL_MS = 30_000;

/** How many notifications are unread, checked on every page change and every half minute. */
function useUnreadCount(): number {
    const [count, setCount] = useState(0);
    const { pathname } = useLocation();

    // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is unused on purpose, to check again on every page change
    useEffect(() => {
        let alive = true;
        const check = () =>
            api<{ count: number }>('/me/notifications/unread-count')
                .then(({ count }) => alive && setCount(count))
                .catch(() => undefined);

        check();
        const timer = setInterval(check, POLL_MS);

        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [pathname]);

    return count;
}

export function Layout() {
    const me = useMe();
    const { logout, can } = useAuth();
    const unread = useUnreadCount();
    const { pathname } = useLocation();

    const links = [
        { to: '/', label: 'Feed' },
        { to: '/notifications', label: 'Notifications', badge: unread },
        ...(can('read:roles') ? [{ to: '/admin', label: 'Admin' }] : []),
    ];

    return (
        <div className="min-h-dvh bg-muted/40">
            <header className="border-b bg-background">
                <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
                    <Link
                        to="/"
                        className="mr-2 font-heading text-lg font-semibold max-sm:hidden"
                    >
                        Atlas
                    </Link>
                    <nav className="flex gap-1">
                        {links.map(({ to, label, badge }) => (
                            <Button
                                key={to}
                                variant={
                                    (
                                        to === '/'
                                            ? pathname === '/'
                                            : pathname.startsWith(to)
                                    )
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                nativeButton={false}
                                render={<NavLink to={to} end={to === '/'} />}
                            >
                                {label}
                                {badge ? <Badge>{badge}</Badge> : null}
                            </Button>
                        ))}
                    </nav>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto rounded-full"
                                    aria-label="Your account"
                                />
                            }
                        >
                            <UserAvatar user={me} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                    <div className="font-medium text-foreground">
                                        {me.name}
                                    </div>
                                    <div className="truncate">{me.email}</div>
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                render={<Link to={`/users/${me.id}`} />}
                            >
                                <UserIcon />
                                Your profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={logout}
                            >
                                <LogOutIcon />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
                <Outlet />
            </main>
        </div>
    );
}
