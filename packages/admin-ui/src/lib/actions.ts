import type {
    ActionResponse,
    ActionSchema,
    FieldSchema,
    RecordKey,
} from '@repo/admin-contract';
import {
    ApiError,
    deleteRecords,
    linkRelated,
    NotFound,
    restoreRecords,
    runAction,
    saveRecord,
} from './api';
import { fileInput, readForm, titleInput } from './form-values';
import { go, recordHref, resourceHref, safePath } from './navigation';
import { getResource } from './schema';

export interface FormState {
    message?: string;
    errors: Record<string, string[]>;
    /** What was submitted, so the form shows it again rather than resetting to the record. */
    submitted?: Record<string, string>;
}

// the form shown again as submitted, its fields' own entries only, a picked record's title and file among them
const refused = (
    { message = 'Some values are not valid', errors = {} }: Partial<FormState>,
    form: FormData,
    fields: FieldSchema[],
): FormState => ({
    message,
    errors,
    submitted: Object.fromEntries(
        fields
            .flatMap(({ name, type }) =>
                type === 'belongsTo'
                    ? [name, titleInput(name)]
                    : type === 'file'
                      ? [name, fileInput(name)]
                      : [name],
            )
            .flatMap((name) =>
                form.has(name) ? [[name, String(form.get(name))]] : [],
            ),
    ),
});

// said on its form, which keeps what was typed, rather than the page's boundary taking it
const failure = (error: unknown) => ({
    message:
        (error instanceof ApiError || error instanceof NotFound) &&
        error.message
            ? error.message
            : 'Could not reach the API',
    errors: {},
});

const keysOf = (form: FormData) =>
    form.getAll('keys').map(String).filter(Boolean);

function saveFile(download: NonNullable<ActionResponse['download']>) {
    const bytes = Uint8Array.from(atob(download.base64), (char) =>
        char.charCodeAt(0),
    );
    const url = URL.createObjectURL(
        new Blob([bytes], { type: download.contentType }),
    );

    Object.assign(document.createElement('a'), {
        href: url,
        download: download.filename,
    }).click();
    // later, as some browsers cancel a download whose url goes at once
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Creates the record without a key, else updates only what changed from `initial`, so no one else's change is undone. */
export async function save(
    resourceName: string,
    key: RecordKey | null,
    initial: Record<string, unknown>,
    _state: FormState,
    form: FormData,
): Promise<FormState> {
    const { fields } = getResource(resourceName);
    const creating = key === null;
    const { values, errors } = readForm(
        fields,
        creating ? 'create' : 'update',
        form,
        initial,
    );

    if (Object.keys(errors).length) return refused({ errors }, form, fields);

    const result = await saveRecord(resourceName, key, values).catch(failure);

    if (!('data' in result)) return refused(result, form, fields);

    // a record created from a parent's panel goes back to the parent
    const back = creating ? safePath(form.get('from')) : undefined;

    go(back ?? recordHref(resourceName, result.data.key), {
        notice: creating ? 'created' : 'updated',
    });

    return { errors: {} };
}

/** Deletes the records the form names, then goes `back`, or to the list. */
export async function remove(resourceName: string, form: FormData) {
    const keys = keysOf(form);
    const index = resourceHref(resourceName);

    if (keys.length === 0) return;

    try {
        await deleteRecords(resourceName, keys, form.get('force') === 'true');
    } catch (error) {
        // another record refers to it: said where the delete was asked for
        if (error instanceof ApiError && error.status === 409)
            return go(safePath(form.get('from')) ?? index, {
                error: error.message,
            });

        throw error;
    }

    go(safePath(form.get('back')) ?? index, { notice: 'deleted' });
}

export async function link(
    attaching: boolean,
    resourceName: string,
    key: RecordKey,
    field: string,
    form: FormData,
) {
    const keys = keysOf(form);
    const path = recordHref(resourceName, key);

    if (keys.length === 0) return;

    try {
        await linkRelated(resourceName, key, field, keys, attaching);
    } catch (error) {
        if (error instanceof ApiError && error.status === 409)
            return go(path, { error: error.message });

        throw error;
    }

    go(path, { notice: attaching ? 'attached' : 'detached' });
}

/** Runs an action with its fields' values, saves any file it made, then goes back to `from`. */
export async function run(
    resourceName: string,
    action: ActionSchema,
    keys: string[],
    from: string,
    _state: FormState,
    form: FormData,
): Promise<FormState> {
    const { values, errors } = readForm(action.fields, 'create', form);

    if (Object.keys(errors).length)
        return refused({ errors }, form, action.fields);

    const result = await runAction(
        resourceName,
        action.name,
        keys,
        values,
    ).catch(failure);

    if ('errors' in result) return refused(result, form, action.fields);
    if (result.download) saveFile(result.download);

    go(from, { message: result.message });

    return { errors: {} };
}

export async function restore(resourceName: string, form: FormData) {
    const keys = keysOf(form);

    if (keys.length === 0) return;

    await restoreRecords(resourceName, keys);
    go(safePath(form.get('from')) ?? resourceHref(resourceName), {
        notice: 'restored',
    });
}
