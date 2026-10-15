import type { SortDirection } from '@repo/admin-contract';
import { Link, useLocation, useParams } from 'react-router';
import { BulkForm } from '@/components/BulkForm';
import { Filters, filterParams } from '@/components/Filters';
import { IconButton } from '@/components/IconButton';
import { EditIcon, PlusIcon, ViewIcon } from '@/components/icons';
import { MetricCards } from '@/components/MetricCard';
import { Notice } from '@/components/Notice';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { RangePicker } from '@/components/RangePicker';
import { RecordTable } from '@/components/RecordTable';
import { SkeletonRows } from '@/components/Skeleton';
import {
    SearchInput,
    SelectionCount,
    useCompact,
} from '@/components/TableControls';
import { getResourceCards, listRecords } from '@/lib/api';
import { useLoad, useTitle } from '@/lib/load';
import { pick, resourceHref, useQuery, withQuery } from '@/lib/navigation';
import { getResource } from '@/lib/schema';

const LIST_PARAMS = [
    'page',
    'perPage',
    'sort',
    'direction',
    'search',
    'trashed',
] as const;
const BULK_FORM = 'bulk';

export function ResourceIndex() {
    const resource = getResource(useParams().resource);
    // each navigation, after which the rows start unchecked, as the rows may be others
    const { key: visit } = useLocation();
    const params = useQuery();
    const listed = pick(params, [
        ...LIST_PARAMS,
        ...resource.filters.flatMap(filterParams),
    ]);
    // the list's links keep the cards' range too, which the list itself does not ask for
    const query: Record<string, string | undefined> = {
        ...listed,
        ...pick(params, ['range', 'from', 'to']),
    };
    const listQuery = new URLSearchParams(listed as Record<string, string>);
    const list = useLoad(
        () => listRecords(resource.name, listQuery),
        [listQuery.toString()],
    );
    // one range for every card, picked as on the dashboard; days from the calendar win over a preset
    const range =
        query.from && query.to ? `${query.from}..${query.to}` : query.range;
    const cards = useLoad(
        async () =>
            resource.metrics.length > 0
                ? getResourceCards(resource.name, range)
                : null,
        [range],
    );
    const compact = useCompact();

    useTitle(resource.label);

    // the list is the page; cards that fail leave it as it is, without them
    if (list.error) throw list.error;

    // the page's frame shows at once, its rows where the table goes once they come
    const data = list.data?.data ?? [];
    const columns = resource.fields.filter((field) => field.visibility.index);
    const indexActions = resource.actions.filter(
        ({ showOnIndex }) => showOnIndex,
    );
    const sortedBy = query.sort ?? resource.defaultSort.field;
    const direction: SortDirection =
        query.direction === 'asc' || query.direction === 'desc'
            ? query.direction
            : query.sort
              ? 'asc'
              : resource.defaultSort.direction;
    const path = resourceHref(resource.name);

    return (
        <>
            <PageHeader title={resource.label}>
                {cards.data && (
                    <RangePicker
                        ranges={resource.ranges}
                        covered={cards.data.range}
                        query={query}
                    />
                )}
                <Link to={`${path}/new`} className="btn btn-primary">
                    <PlusIcon />
                    New {resource.singularLabel.toLowerCase()}
                </Link>
            </PageHeader>

            <Notice />

            {resource.metrics.length > 0 && !cards.error && (
                <MetricCards
                    metrics={resource.metrics}
                    cards={cards.data?.cards}
                />
            )}

            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        {resource.searchable && (
                            <search>
                                <SearchInput
                                    defaultValue={query.search}
                                    placeholder={`Filter ${resource.label.toLowerCase()}...`}
                                    label={`Search ${resource.label.toLowerCase()}`}
                                />
                            </search>
                        )}
                        {(resource.filters.length > 0 ||
                            resource.softDeletes) && (
                            <Filters
                                filters={resource.filters}
                                query={query}
                                softDeletes={resource.softDeletes}
                            />
                        )}
                    </div>
                    {/* with no rows, still there for an action that needs none, e.g. an import */}
                    {(data.length > 0 ||
                        indexActions.some(({ standalone }) => standalone)) && (
                        <div className="flex flex-wrap items-center gap-2">
                            <BulkForm
                                key={visit}
                                id={BULK_FORM}
                                resource={resource.name}
                                from={`${path}${withQuery(query, {})}`}
                                actions={indexActions}
                                softDeletes={resource.softDeletes}
                                trashed={query.trashed}
                            />
                        </div>
                    )}
                </div>

                {!list.data ? (
                    <div className="rounded-md border px-4">
                        <SkeletonRows rows={8} />
                    </div>
                ) : data.length === 0 ? (
                    <div className="rounded-md border px-4 py-12 text-center text-muted-foreground">
                        {query.search
                            ? `Nothing matches “${query.search}”.`
                            : Object.keys(query).some(
                                    (param) =>
                                        param.startsWith('filter.') ||
                                        param === 'trashed',
                                )
                              ? `No ${resource.label.toLowerCase()} match these filters.`
                              : `No ${resource.label.toLowerCase()} yet.`}
                    </div>
                ) : (
                    <RecordTable
                        key={visit}
                        resource={resource}
                        columns={columns}
                        records={data}
                        form={BULK_FORM}
                        compact={compact}
                        sort={{
                            field: sortedBy,
                            direction,
                            href: (sort, next) =>
                                withQuery(query, {
                                    sort,
                                    direction: next,
                                    page: undefined,
                                }),
                        }}
                        actions={(record, href) => (
                            <>
                                <IconButton
                                    href={href}
                                    label="View"
                                    of={record.title}
                                    icon={<ViewIcon />}
                                    align="end"
                                />
                                <IconButton
                                    href={`${href}/edit`}
                                    label="Edit"
                                    of={record.title}
                                    icon={<EditIcon />}
                                    align="end"
                                />
                            </>
                        )}
                    />
                )}

                {list.data && (
                    <Pagination
                        meta={list.data.meta}
                        query={query}
                        perPageOptions={resource.perPageOptions}
                    >
                        {data.length > 0 && (
                            <SelectionCount
                                key={visit}
                                form={BULK_FORM}
                                total={data.length}
                            />
                        )}
                    </Pagination>
                )}
            </div>
        </>
    );
}
