import type {
    FieldSchema,
    FileValue,
    RecordInput,
    RelatedRecord,
} from '@repo/admin-contract';

type FormMode = 'create' | 'update';

export const formFields = (fields: FieldSchema[], mode: FormMode) =>
    fields.filter(
        (field) =>
            !field.readonly &&
            (mode === 'create'
                ? field.visibility.create
                : field.visibility.update),
    );

// text a NOT NULL column keeps as empty, rather than as no value
const TEXT = new Set(['text', 'textarea', 'email']);

/** The form's strings as the API takes them; an update leaves out what is as `initial` had it. */
export function readForm(
    fields: FieldSchema[],
    mode: FormMode,
    form: FormData,
    initial: Record<string, unknown> = {},
): { values: RecordInput; errors: Record<string, string[]> } {
    const values: RecordInput = {};
    const errors: Record<string, string[]> = {};

    for (const field of formFields(fields, mode)) {
        const { name, type, nullable } = field;
        // a textarea's lines as the record has them, whatever ends the browser gives them
        const raw =
            type === 'boolean'
                ? String(form.has(name))
                : String(form.get(name) ?? '').replace(/\r\n/g, '\n');

        if (
            mode === 'update' &&
            name in initial &&
            raw === inputValue(field, initial[name])
        )
            continue;

        if (type === 'boolean') {
            values[name] = form.has(name);
            continue;
        }

        const empty = raw.trim() === '';

        // left empty when editing, a password stays as it is
        if (type === 'password' && empty) continue;

        // empty clears an optional field, or empties a NOT NULL text being edited; otherwise it is
        // left out, so a create takes the column's default, and the API says when it is required
        if (empty) {
            if (nullable) values[name] = null;
            else if (mode === 'update' && TEXT.has(type)) values[name] = '';
            continue;
        }

        if (type === 'number') values[name] = Number(raw);
        // the value the upload returned, kept as JSON, whatever its type
        else if (type === 'file' || type === 'json')
            try {
                values[name] = JSON.parse(raw);
            } catch {
                errors[name] = [`${field.label} must be valid JSON`];
            }
        else if (type === 'select')
            values[name] =
                field.options?.find((option) => String(option.value) === raw)
                    ?.value ?? raw;
        // a belongsTo's key too, which the API takes as text whatever the column's type
        else values[name] = raw;
    }

    return { values, errors };
}

function inputValue(field: FieldSchema, value: unknown): string {
    if (value === null || value === undefined) return '';
    if (field.type === 'belongsTo') return String((value as RelatedRecord).key);
    if (field.type === 'file')
        return JSON.stringify((value as FileValue).value);
    if (field.type === 'json') return JSON.stringify(value, null, 2);

    return String(value);
}

export function relatedTitle(value: unknown): string {
    return value && typeof value === 'object'
        ? (value as RelatedRecord).title
        : '';
}

/** The hidden input that carries a picked record's title through a refused submit. */
export const titleInput = (name: string) => `${name}.title`;

/** The hidden input that carries an uploaded file's url and name through a refused submit. */
export const fileInput = (name: string) => `${name}.file`;

/** What a field's input starts from: the record's value, or after a refused submit what was submitted. */
export function startingInput(
    field: FieldSchema,
    values: Record<string, unknown>,
    submitted: Record<string, string> | undefined,
): { value: string; title: string; file: FileValue | null } {
    const { name } = field;

    if (!submitted)
        return {
            value: inputValue(field, values[name]),
            title: relatedTitle(values[name]),
            file: (values[name] as FileValue | null | undefined) ?? null,
        };

    return {
        value:
            field.type === 'boolean'
                ? String(submitted[name] === 'on')
                : (submitted[name] ?? ''),
        title: submitted[titleInput(name)] ?? '',
        file: JSON.parse(
            submitted[fileInput(name)] || 'null',
        ) as FileValue | null,
    };
}
