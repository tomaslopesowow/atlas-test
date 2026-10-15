import type {
    FieldSchema,
    RecordKey,
    ResourceSchema,
} from '@repo/admin-contract';
import { Link, useLocation } from 'react-router';
import { link } from '@/lib/actions';
import { listRelated } from '@/lib/api';
import { titleInput } from '@/lib/form-values';
import { useLoad } from '@/lib/load';
import { pageOf, recordHref, resourceHref, useQuery } from '@/lib/navigation';
import { getResource } from '@/lib/schema';
import { IconButton } from './IconButton';
import { PlusIcon, ViewIcon } from './icons';
import { Empty, Panel, PrevNext } from './Panel';
import { RecordTable } from './RecordTable';
import { RelationPicker } from './RelationPicker';
import { SkeletonRows } from './Skeleton';

/** The records of a hasMany or belongsToMany field, paged by its own `<field>.page` parameter. */
export function RelationPanel({
    resource,
    recordKey,
    recordTitle,
    field,
}: {
    resource: ResourceSchema;
    recordKey: RecordKey;
    /** What a record created from the panel shows it points at. */
    recordTitle: string;
    field: FieldSchema;
}) {
    const target = getResource(field.relation?.resource);
    const pageParam = `${field.name}.page`;
    const page = pageOf(useQuery()[pageParam]);
    // after an attach, its picker starts empty again rather than offering the record just attached
    const { key: visit } = useLocation();
    const related = useLoad(
        () =>
            listRelated(
                resource.name,
                recordKey,
                field.name,
                new URLSearchParams({ page: String(page) }),
            ),
        [resource.name, recordKey, field.name, page],
    );
    // a readonly() belongsToMany is only listed
    const linkable = field.type === 'belongsToMany' && !field.readonly;
    // a belongsTo back to this record says the same on every row
    const columns = target.fields.filter(
        (column) =>
            column.visibility.index &&
            !(
                column.type === 'belongsTo' &&
                column.relation?.resource === resource.name
            ),
    );

    if (related.error) throw related.error;
    if (!related.data)
        return (
            <Panel id={`panel-${field.name}`} title={field.label}>
                <div className="border-t px-6 py-2">
                    <SkeletonRows rows={3} />
                </div>
            </Panel>
        );

    const { data, meta } = related.data;
    const path = recordHref(resource.name, recordKey);

    return (
        <Panel
            id={`panel-${field.name}`}
            title={field.label}
            actions={
                <>
                    {field.type === 'hasMany' && field.relation?.inverse && (
                        <Link
                            to={`${resourceHref(target.name)}/new?${new URLSearchParams(
                                {
                                    [field.relation.inverse]: String(recordKey),
                                    [titleInput(field.relation.inverse)]:
                                        recordTitle,
                                    from: path,
                                },
                            )}`}
                            className="btn btn-outline btn-sm"
                        >
                            <PlusIcon />
                            New {target.singularLabel.toLowerCase()}
                        </Link>
                    )}
                    {linkable && (
                        <form
                            key={visit}
                            action={link.bind(
                                null,
                                true,
                                resource.name,
                                recordKey,
                                field.name,
                            )}
                            className="flex items-center gap-2"
                        >
                            <div className="w-64">
                                <RelationPicker
                                    id={`attach-${field.name}`}
                                    name="keys"
                                    resource={target.name}
                                    clearable={false}
                                    placeholder={`Find a ${target.singularLabel.toLowerCase()} to attach`}
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-outline btn-sm"
                            >
                                Attach
                            </button>
                        </form>
                    )}
                </>
            }
        >
            {data.length === 0 ? (
                <Empty>No {field.label.toLowerCase()} yet.</Empty>
            ) : (
                <RecordTable
                    resource={target}
                    columns={columns}
                    records={data}
                    flush
                    actions={(record, href) => (
                        <>
                            <IconButton
                                href={href}
                                label="View"
                                of={record.title}
                                icon={<ViewIcon />}
                                align="end"
                            />
                            {linkable && (
                                <form
                                    action={link.bind(
                                        null,
                                        false,
                                        resource.name,
                                        recordKey,
                                        field.name,
                                    )}
                                    className="inline"
                                >
                                    <input
                                        type="hidden"
                                        name="keys"
                                        value={record.key}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-ghost btn-sm text-destructive"
                                    >
                                        Detach
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                />
            )}

            <PrevNext
                label={`Pages of ${field.label}`}
                summary={
                    meta.total === null ? undefined : `${meta.total} in all`
                }
                param={pageParam}
                page={page}
                hasMore={meta.hasMore}
            />
        </Panel>
    );
}
