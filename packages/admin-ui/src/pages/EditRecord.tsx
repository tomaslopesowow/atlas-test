import { useParams } from 'react-router';
import { FieldsForm } from '@/components/FieldsForm';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/Skeleton';
import { save } from '@/lib/actions';
import { getRecord } from '@/lib/api';
import { formFields } from '@/lib/form-values';
import { Await, useLoad, useTitle } from '@/lib/load';
import { recordHref } from '@/lib/navigation';
import { getResource } from '@/lib/schema';

export function EditRecord() {
    const params = useParams();
    const resource = getResource(params.resource);
    const state = useLoad(() => getRecord(resource.name, params.key ?? ''), []);

    useTitle(state.data && `Edit ${state.data.data.title}`);

    return (
        <Await state={state} fallback={<PageSkeleton />}>
            {({ data }) => (
                <>
                    <PageHeader
                        title={`Edit ${resource.singularLabel.toLowerCase()}`}
                        back={{
                            href: recordHref(resource.name, data.key),
                            label: data.title,
                        }}
                    />
                    <FieldsForm
                        submit={save.bind(
                            null,
                            resource.name,
                            data.key,
                            data.values,
                        )}
                        fields={formFields(resource.fields, 'update')}
                        values={data.values}
                        resource={resource.name}
                        creating={false}
                        label="Save"
                        busyLabel="Saving…"
                        cancelHref={recordHref(resource.name, data.key)}
                    />
                </>
            )}
        </Await>
    );
}
