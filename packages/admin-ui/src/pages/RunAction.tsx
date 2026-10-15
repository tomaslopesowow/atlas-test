import { useParams, useSearchParams } from 'react-router';
import { FieldsForm } from '@/components/FieldsForm';
import { PageHeader } from '@/components/PageHeader';
import { run } from '@/lib/actions';
import { NotFound } from '@/lib/api';
import { useTitle } from '@/lib/load';
import { resourceHref, safePath } from '@/lib/navigation';
import { getResource } from '@/lib/schema';

/** The action, the records it runs on and where to go back to, from `?action=publish&keys=1&keys=2&from=/resources/posts`. */
export function RunAction() {
    const resource = getResource(useParams().resource);
    const [params] = useSearchParams();
    const action = resource.actions.find(
        ({ name }) => name === params.get('action'),
    );
    const keys = params.getAll('keys').filter(Boolean);
    const from = safePath(params.get('from')) ?? resourceHref(resource.name);

    useTitle(action?.label);

    if (!action || (keys.length === 0 && !action.standalone))
        throw new NotFound('No such action');

    const label = (
        keys.length === 1 ? resource.singularLabel : resource.label
    ).toLowerCase();

    return (
        <>
            <PageHeader
                title={action.label}
                back={{ href: from, label: resource.label }}
                subtitle={
                    action.standalone
                        ? resource.label
                        : `On ${keys.length} ${label}`
                }
            />
            <FieldsForm
                submit={run.bind(null, resource.name, action, keys, from)}
                fields={action.fields}
                resource={resource.name}
                creating
                label={action.label}
                busyLabel="Running…"
                destructive={action.destructive}
                cancelHref={from}
            >
                {action.confirmText && (
                    <p className="text-muted-foreground">
                        {action.confirmText}
                    </p>
                )}
            </FieldsForm>
        </>
    );
}
