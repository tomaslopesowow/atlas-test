import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { searchEverything } from '@/lib/api';
import { Await, useLoad, useTitle } from '@/lib/load';
import { recordHref, resourceHref, useQuery } from '@/lib/navigation';

export function Search() {
    const { q = '' } = useQuery();
    const state = useLoad(() => searchEverything(q), [q]);

    useTitle('Search');

    return (
        <>
            <PageHeader title={q ? `Search: ${q}` : 'Search'} />
            <Await state={state}>
                {({ data }) =>
                    data.length === 0 ? (
                        <p className="text-muted-foreground">
                            {q
                                ? `Nothing matches “${q}”.`
                                : 'Type something to search for.'}
                        </p>
                    ) : (
                        data.map((group) => (
                            <Panel
                                key={group.resource}
                                id={`results-${group.resource}`}
                                title={group.label}
                                actions={
                                    <Link
                                        to={`${resourceHref(group.resource)}?${new URLSearchParams({ search: q })}`}
                                        className="btn btn-outline btn-sm"
                                    >
                                        All matches
                                    </Link>
                                }
                            >
                                <ul className="divide-y border-t">
                                    {group.records.map((record) => (
                                        <li key={record.key}>
                                            <Link
                                                to={recordHref(
                                                    group.resource,
                                                    record.key,
                                                )}
                                                className="block px-6 py-3 font-medium transition-colors hover:bg-muted/50"
                                            >
                                                {record.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        ))
                    )
                }
            </Await>
        </>
    );
}
