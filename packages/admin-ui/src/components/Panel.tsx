import { useQuery, withQuery } from '@/lib/navigation';
import { IconButton } from './IconButton';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

/** A card with a title and what to do beside it, over a list or table that runs to its edges. */
export function Panel({
    id,
    title,
    actions,
    children,
}: {
    id: string;
    title: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="card" aria-labelledby={id}>
            <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                <h2 id={id} className="font-semibold">
                    {title}
                </h2>
                {actions && (
                    <div className="flex flex-wrap items-center gap-2">
                        {actions}
                    </div>
                )}
            </header>
            {children}
        </section>
    );
}

/** A panel's foot, linking to the pages before and after when there are; the page is the query's `param`. */
export function PrevNext({
    label,
    page,
    summary = `Page ${page}`,
    param = 'page',
    hasMore,
}: {
    label: string;
    page: number;
    summary?: string;
    param?: string;
    hasMore: boolean;
}) {
    const query = useQuery();
    const to = (other: number) =>
        withQuery(query, { [param]: other === 1 ? undefined : other });

    if (page === 1 && !hasMore) return null;

    return (
        <div className="flex items-center justify-between gap-2 border-t px-6 py-3">
            <span className="text-sm text-muted-foreground">{summary}</span>
            <nav className="flex gap-2" aria-label={label}>
                {[
                    {
                        href: page > 1 ? to(page - 1) : undefined,
                        text: 'Previous page',
                        icon: <ChevronLeftIcon />,
                    },
                    {
                        href: hasMore ? to(page + 1) : undefined,
                        text: 'Next page',
                        icon: <ChevronRightIcon />,
                    },
                ].map(({ href, text, icon }) => (
                    // no page there: a disabled button, nothing to follow for a pointer or a screen reader
                    <IconButton
                        key={text}
                        href={href}
                        label={text}
                        icon={icon}
                        variant="outline"
                        align={text === 'Next page' ? 'end' : 'center'}
                        disabled={!href}
                    />
                ))}
            </nav>
        </div>
    );
}

export function Empty({ children }: { children: React.ReactNode }) {
    return (
        <p className="border-t px-6 py-10 text-center text-muted-foreground">
            {children}
        </p>
    );
}
