import { Link } from 'react-router';
import { ChevronLeftIcon } from './icons';

export function PageHeader({
    title,
    subtitle,
    back,
    children,
}: {
    title: string;
    subtitle?: string;
    back?: { href: string; label: string };
    children?: React.ReactNode;
}) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-1">
                {back && (
                    <Link
                        to={back.href}
                        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4"
                    >
                        <ChevronLeftIcon />
                        {back.label}
                    </Link>
                )}
                <h1 className="truncate text-3xl font-bold tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-muted-foreground">{subtitle}</p>
                )}
            </div>
            {children && (
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                </div>
            )}
        </header>
    );
}
