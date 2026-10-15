import type { ListMeta } from '@repo/admin-contract';
import { useNavigate } from 'react-router';
import { withQuery } from '@/lib/navigation';
import { IconButton } from './IconButton';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
} from './icons';
import { Select } from './Select';
import { DensityToggle } from './TableControls';

/** Under a table: what `children` say on the left, then the density, page size and the way through the pages. */
export function Pagination({
    meta,
    query,
    perPageOptions,
    children,
}: {
    meta: ListMeta;
    query: Record<string, string | undefined>;
    perPageOptions: number[];
    children?: React.ReactNode;
}) {
    const navigate = useNavigate();
    const { page, perPage, lastPage, hasMore } = meta;
    const pages = [
        {
            to: 1,
            label: 'First page',
            icon: <ChevronsLeftIcon />,
            off: page <= 1,
            wide: true,
        },
        {
            to: page - 1,
            label: 'Previous page',
            icon: <ChevronLeftIcon />,
            off: page <= 1,
        },
        {
            to: page + 1,
            label: 'Next page',
            icon: <ChevronRightIcon />,
            off: !hasMore,
        },
        // without a count, the last page is not known
        ...(lastPage === null
            ? []
            : [
                  {
                      to: lastPage,
                      label: 'Last page',
                      icon: <ChevronsRightIcon />,
                      off: !hasMore,
                      wide: true,
                  },
              ]),
    ];

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
            <div className="flex-1 text-sm text-muted-foreground">
                {children}
            </div>
            <div className="flex flex-wrap items-center gap-4 lg:gap-8">
                <div className="flex items-center gap-2">
                    <DensityToggle />
                    <span className="text-sm font-medium">Rows per page</span>
                    <Select
                        label="Rows per page"
                        value={String(perPage)}
                        options={perPageOptions.map((size) => ({
                            value: String(size),
                            label: String(size),
                        }))}
                        onChange={(size) =>
                            navigate(
                                withQuery(query, {
                                    perPage: size,
                                    page: undefined,
                                }),
                            )
                        }
                        className="input h-8 w-20 text-sm"
                        up
                    />
                </div>
                <span className="text-sm font-medium">
                    Page {page}
                    {lastPage !== null && ` of ${lastPage}`}
                </span>
                <nav className="flex items-center gap-2" aria-label="Pages">
                    {pages.map(({ to, label, icon, off, wide }) => (
                        // no page there: nothing to follow, rather than a link to page 0
                        <IconButton
                            key={label}
                            href={
                                off
                                    ? undefined
                                    : withQuery(query, {
                                          page: to === 1 ? undefined : to,
                                      })
                            }
                            label={label}
                            icon={icon}
                            variant="outline"
                            align={label === 'Last page' ? 'end' : 'center'}
                            tooltipClassName={
                                wide ? 'hidden lg:inline-flex' : undefined
                            }
                            disabled={off}
                        />
                    ))}
                </nav>
            </div>
        </div>
    );
}
