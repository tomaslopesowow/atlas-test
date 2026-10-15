import { useParams } from 'react-router';
import { FieldsForm } from '@/components/FieldsForm';
import { PageHeader } from '@/components/PageHeader';
import { save } from '@/lib/actions';
import { formFields, titleInput } from '@/lib/form-values';
import { useTitle } from '@/lib/load';
import { resourceHref, safePath, useQuery } from '@/lib/navigation';
import { getResource } from '@/lib/schema';

/** A new record, its belongsTo fields picked already as a parent's panel links here: `?author=3&author.title=Ada&from=…`. */
export function NewRecord() {
    const resource = getResource(useParams().resource);
    const query = useQuery();
    const values = Object.fromEntries(
        resource.fields.flatMap((field) => {
            const key = query[field.name];

            return field.type === 'belongsTo' && key
                ? [
                      [
                          field.name,
                          { key, title: query[titleInput(field.name)] ?? key },
                      ],
                  ]
                : [];
        }),
    );
    const back = safePath(query.from);
    const index = resourceHref(resource.name);
    const title = `New ${resource.singularLabel.toLowerCase()}`;

    useTitle(title);

    return (
        <>
            <PageHeader
                title={title}
                back={{ href: index, label: resource.label }}
            />
            <FieldsForm
                submit={save.bind(null, resource.name, null, {})}
                fields={formFields(resource.fields, 'create')}
                values={values}
                resource={resource.name}
                creating
                label={`Create ${resource.singularLabel.toLowerCase()}`}
                busyLabel="Saving…"
                cancelHref={back ?? index}
            >
                {/* once created, back to the parent it was made from */}
                {back && <input type="hidden" name="from" value={back} />}
            </FieldsForm>
        </>
    );
}
