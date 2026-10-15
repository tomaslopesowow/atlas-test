import { Link } from 'react-router';
import { MetricCards } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { RangePicker } from '@/components/RangePicker';
import { getDashboard } from '@/lib/api';
import { useLoad, useTitle } from '@/lib/load';
import { resourceHref, useQuery } from '@/lib/navigation';
import { useSchema } from '@/lib/schema';

export function Dashboard() {
    const { resources, dashboard } = useSchema();
    const { range, from, to } = useQuery();
    // days picked on the calendar win over a preset; the API checks either
    const picked = from && to ? `${from}..${to}` : range;
    const state = useLoad(
        async () => (dashboard ? getDashboard(picked) : null),
        [picked],
    );

    useTitle(dashboard?.label ?? 'Dashboard');

    if (state.error) throw state.error;

    if (!dashboard)
        return (
            <>
                <PageHeader title="Dashboard" />
                {resources.length === 0 ? (
                    <p className="text-muted-foreground">
                        No resources yet: in the API, give an entity a class
                        extending Resource, among a module's providers.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {resources.map((resource) => (
                            <Link
                                key={resource.name}
                                to={resourceHref(resource.name)}
                                className="card grid gap-1 p-6 transition-colors hover:bg-accent/50"
                            >
                                <span className="font-semibold">
                                    {resource.label}
                                </span>
                                <span className="text-muted-foreground">
                                    {resource.fields.length} fields
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </>
        );

    return (
        <>
            <PageHeader title={dashboard.label}>
                {state.data && (
                    <RangePicker
                        ranges={dashboard.ranges}
                        covered={state.data.range}
                    />
                )}
            </PageHeader>
            <MetricCards metrics={dashboard.cards} cards={state.data?.cards} />
        </>
    );
}
