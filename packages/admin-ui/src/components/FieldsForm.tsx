import type { FieldSchema } from '@repo/admin-contract';
import { useActionState } from 'react';
import { Link } from 'react-router';
import type { FormState } from '@/lib/actions';
import { startingInput } from '@/lib/form-values';
import { FieldInput } from './FieldInput';
import { ErrorAlert } from './Notice';

const INITIAL: FormState = { errors: {} };

/** Fields from `values` for `submit`, a record's save or an action's run; `children` go above them. */
export function FieldsForm({
    submit,
    fields,
    values = {},
    resource,
    creating,
    label,
    busyLabel,
    destructive = false,
    cancelHref,
    children,
}: {
    submit: (state: FormState, form: FormData) => Promise<FormState>;
    fields: FieldSchema[];
    values?: Record<string, unknown>;
    resource: string;
    creating: boolean;
    label: string;
    busyLabel: string;
    destructive?: boolean;
    cancelHref: string;
    children?: React.ReactNode;
}) {
    const [state, action, pending] = useActionState(submit, INITIAL);
    const { submitted } = state;

    return (
        <form
            // remounted per refused submit, so the inputs start from what was submitted
            key={submitted ? JSON.stringify(submitted) : 'fields'}
            action={action}
            className="card max-w-2xl space-y-6 p-6"
        >
            {state.message && <ErrorAlert>{state.message}</ErrorAlert>}
            {children}

            {fields.map((field) => (
                <FieldInput
                    key={field.name}
                    field={field}
                    {...startingInput(field, values, submitted)}
                    resource={resource}
                    errors={state.errors[field.name]}
                    creating={creating}
                />
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
                <button
                    type="submit"
                    className={`btn ${destructive ? 'btn-destructive' : 'btn-primary'}`}
                    disabled={pending}
                >
                    {pending ? busyLabel : label}
                </button>
                <Link to={cancelHref} className="btn btn-outline">
                    Cancel
                </Link>
            </div>
        </form>
    );
}
