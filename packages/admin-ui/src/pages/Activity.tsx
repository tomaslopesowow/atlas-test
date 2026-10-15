import { useNavigate } from 'react-router';
import { ActivityList } from '@/components/ActivityList';
import { PageHeader } from '@/components/PageHeader';
import { Panel, PrevNext } from '@/components/Panel';
import { Select } from '@/components/Select';
import { SkeletonRows } from '@/components/Skeleton';
import { getActivity } from '@/lib/api';
import { Await, useLoad, useTitle } from '@/lib/load';
import { pageOf, useQuery } from '@/lib/navigation';
import { useSchema } from '@/lib/schema';

export function Activity() {
    const query = useQuery();
    const navigate = useNavigate();
    const page = pageOf(query.page);
    const { resources } = useSchema();
    const state = useLoad(
        () => getActivity({ resource: query.resource, page }),
        [query.resource, page],
    );

    useTitle('Activity');

    return (
        <>
            <PageHeader
                title="Activity"
                subtitle="Every change made through the panel, newest first"
            />
            <Panel
                id="panel-activity"
                title="Changes"
                actions={
                    // applies as it is picked, from the first page
                    <Select
                        label="Resource"
                        value={query.resource ?? ''}
                        options={[
                            { value: '', label: 'All resources' },
                            ...resources
                                .filter(({ logsActivity }) => logsActivity)
                                .map(({ name, label }) => ({
                                    value: name,
                                    label,
                                })),
                        ]}
                        onChange={(resource) =>
                            navigate(
                                resource
                                    ? `?${new URLSearchParams({ resource })}`
                                    : '?',
                            )
                        }
                        className="input h-8 w-48 text-sm"
                    />
                }
            >
                <Await
                    state={state}
                    fallback={
                        <div className="border-t px-6 py-2">
                            <SkeletonRows />
                        </div>
                    }
                >
                    {({ data, meta }) => (
                        <>
                            <ActivityList entries={data} showRecord />
                            <PrevNext
                                label="Pages"
                                page={page}
                                hasMore={meta.hasMore}
                            />
                        </>
                    )}
                </Await>
            </Panel>
        </>
    );
}
