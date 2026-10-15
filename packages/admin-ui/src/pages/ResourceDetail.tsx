import { Link, useParams } from 'react-router';
import { ActivityList } from '@/components/ActivityList';
import { DeleteForm } from '@/components/DeleteForm';
import { FieldValue } from '@/components/FieldValue';
import { Notice } from '@/components/Notice';
import { PageHeader } from '@/components/PageHeader';
import { Panel, PrevNext } from '@/components/Panel';
import { RelationPanel } from '@/components/RelationPanel';
import { PageSkeleton } from '@/components/Skeleton';
import { restore } from '@/lib/actions';
import { getActivity, getRecord } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useLoad, useTitle } from '@/lib/load';
import {
    pageOf,
    recordHref,
    resourceHref,
    runHref,
    useQuery,
} from '@/lib/navigation';
import { getResource } from '@/lib/schema';

export function ResourceDetail() {
    const params = useParams();
    const resource = getResource(params.resource);
    const historyPage = pageOf(useQuery()['history.page']);
    const record = useLoad(
        () => getRecord(resource.name, params.key ?? ''),
        [],
    );
    const history = useLoad(
        async () =>
            resource.logsActivity
                ? getActivity({
                      resource: resource.name,
                      key: params.key,
                      page: historyPage,
                  })
                : null,
        [historyPage],
    );

    useTitle(record.data?.data.title);

    if (record.error) throw record.error;
    if (history.error) throw history.error;
    if (!record.data) return <PageSkeleton />;

    const { data } = record.data;
    const key = String(data.key);
    const path = recordHref(resource.name, data.key);
    const deletedAt = resource.deletedAtField
        ? data.values[resource.deletedAtField]
        : null;
    const isPanel = (type: string) =>
        type === 'hasMany' || type === 'belongsToMany';

    return (
        <>
            <PageHeader
                title={data.title}
                back={{
                    href: resourceHref(resource.name),
                    label: resource.label,
                }}
            >
                {resource.actions
                    .filter(({ showOnDetail }) => showOnDetail)
                    .map((action) => (
                        <Link
                            key={action.name}
                            to={runHref(
                                resource.name,
                                action.name,
                                [key],
                                path,
                            )}
                            className="btn btn-outline"
                        >
                            {action.label}
                        </Link>
                    ))}
                <Link to={`${path}/edit`} className="btn btn-primary">
                    Edit
                </Link>
                {!deletedAt && (
                    <DeleteForm
                        resource={resource.name}
                        recordKey={key}
                        from={path}
                        restorable={resource.softDeletes}
                    />
                )}
            </PageHeader>

            <Notice />

            {deletedAt && (
                <div
                    className="alert alert-error flex flex-wrap items-center gap-2"
                    role="status"
                >
                    <span className="mr-auto">
                        Deleted on {formatDateTime(deletedAt)}
                    </span>
                    <form action={restore.bind(null, resource.name)}>
                        <input type="hidden" name="keys" value={key} />
                        <input type="hidden" name="from" value={path} />
                        <button
                            type="submit"
                            className="btn btn-outline btn-sm"
                        >
                            Restore
                        </button>
                    </form>
                    <DeleteForm
                        resource={resource.name}
                        recordKey={key}
                        from={path}
                        force
                    />
                </div>
            )}

            <section className="card">
                <dl className="divide-y">
                    {resource.fields
                        .filter(
                            (field) =>
                                field.visibility.detail && !isPanel(field.type),
                        )
                        .map((field) => (
                            <div
                                key={field.name}
                                className="grid gap-1 px-6 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4"
                            >
                                <dt className="text-sm font-medium text-muted-foreground">
                                    {field.label}
                                </dt>
                                <dd className="min-w-0 break-words">
                                    <FieldValue
                                        field={field}
                                        value={data.values[field.name]}
                                    />
                                </dd>
                            </div>
                        ))}
                </dl>
            </section>

            {resource.fields
                .filter(
                    (field) => field.visibility.detail && isPanel(field.type),
                )
                .map((field) => (
                    <RelationPanel
                        key={field.name}
                        resource={resource}
                        recordKey={data.key}
                        recordTitle={data.title}
                        field={field}
                    />
                ))}

            {history.data && (
                <Panel id="panel-history" title="History">
                    <ActivityList entries={history.data.data} />
                    <PrevNext
                        label="Pages of history"
                        param="history.page"
                        page={historyPage}
                        hasMore={history.data.meta.hasMore}
                    />
                </Panel>
            )}
        </>
    );
}
