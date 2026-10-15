import type { FieldSchema, FileValue } from '@repo/admin-contract';
import { Combobox } from './Combobox';
import { CUSTOM_FIELDS } from './custom-fields';
import { DateTimeInput } from './DateTimeInput';
import { FileInput } from './FileInput';
import { RelationPicker } from './RelationPicker';
import { Select } from './Select';

const INPUT_TYPES: Partial<Record<FieldSchema['type'], string>> = {
    email: 'email',
    password: 'password',
    number: 'number',
    date: 'date',
};

// from this many options on, a list is typed into rather than scrolled through
const COMBOBOX_FROM = 20;

/** The input for one field, with its label, help and the API's errors for it. */
export function FieldInput({
    field,
    value,
    title,
    file,
    resource,
    errors = [],
    creating,
}: {
    field: FieldSchema;
    /** The value as text: what the record holds, or what was last submitted. */
    value: string;
    /** The title of the record a belongsTo field points at. */
    title: string;
    file: FileValue | null;
    /** What a file field uploads through. */
    resource: string;
    errors?: string[];
    creating: boolean;
}) {
    const id = `field-${field.name}`;
    const describedBy =
        [field.help && `${id}-help`, errors.length && `${id}-errors`]
            .filter(Boolean)
            .join(' ') || undefined;
    const invalid = errors.length > 0;
    // a password left empty when editing keeps the one stored
    const required = field.required && (creating || field.type !== 'password');
    const limits = field.constraints ?? {};
    const common = {
        id,
        name: field.name,
        required,
        'aria-invalid': invalid,
        'aria-describedby': describedBy,
    };

    let input: React.ReactNode;

    switch (field.type) {
        case 'boolean':
            input = (
                <label className="flex w-fit items-center gap-2 text-sm font-medium">
                    <input
                        {...common}
                        type="checkbox"
                        className="checkbox"
                        required={false}
                        defaultChecked={value === 'true'}
                    />
                    {field.label}
                </label>
            );
            break;
        case 'textarea':
        case 'json':
            input = (
                <textarea
                    {...common}
                    className={`input ${field.type === 'json' ? 'font-mono text-xs' : ''}`}
                    defaultValue={value}
                    minLength={limits.minLength}
                    maxLength={limits.maxLength}
                />
            );
            break;
        case 'select': {
            const options = (field.options ?? []).map((option) => ({
                value: String(option.value),
                label: option.label,
            }));
            // a choice of none for a nullable field, or one not set yet
            const clearable = field.nullable || !value;

            input =
                options.length >= COMBOBOX_FROM ? (
                    <Combobox
                        id={id}
                        name={field.name}
                        options={options}
                        defaultValue={value}
                        defaultLabel={
                            options.find((option) => option.value === value)
                                ?.label
                        }
                        clearable={clearable}
                        placeholder={clearable ? '—' : 'Search…'}
                        invalid={invalid}
                        describedBy={describedBy}
                    />
                ) : (
                    // the label element names it by id, which the dropdown's button cannot take
                    <Select
                        id={id}
                        name={field.name}
                        options={
                            clearable
                                ? [{ value: '', label: '—' }, ...options]
                                : options
                        }
                        defaultValue={value}
                        labelledBy={`${id}-label`}
                        invalid={invalid}
                        describedBy={describedBy}
                    />
                );
            break;
        }
        case 'belongsTo':
            input = (
                <RelationPicker
                    id={id}
                    name={field.name}
                    resource={field.relation?.resource ?? ''}
                    defaultKey={value}
                    defaultTitle={title}
                    clearable={field.nullable}
                    invalid={invalid}
                    describedBy={describedBy}
                />
            );
            break;
        case 'file':
            input = (
                <FileInput
                    id={id}
                    resource={resource}
                    field={field}
                    defaultFile={file}
                    invalid={invalid}
                    describedBy={describedBy}
                />
            );
            break;
        case 'custom': {
            const Custom = field.component
                ? CUSTOM_FIELDS[field.component]?.Input
                : undefined;

            input = Custom ? (
                <Custom
                    id={id}
                    field={field}
                    value={value}
                    invalid={invalid}
                    describedBy={describedBy}
                />
            ) : (
                <input
                    {...common}
                    type="text"
                    className="input"
                    defaultValue={value}
                />
            );
            break;
        }
        case 'datetime':
            input = (
                <DateTimeInput
                    id={id}
                    name={field.name}
                    defaultValue={value}
                    required={required}
                    invalid={invalid}
                    describedBy={describedBy}
                />
            );
            break;
        default:
            input = (
                <input
                    {...common}
                    type={INPUT_TYPES[field.type] ?? 'text'}
                    className="input"
                    defaultValue={field.type === 'password' ? '' : value}
                    min={limits.min}
                    max={limits.max}
                    step={
                        field.type === 'number'
                            ? limits.integer
                                ? 1
                                : 'any'
                            : undefined
                    }
                    minLength={limits.minLength}
                    maxLength={limits.maxLength}
                    autoComplete={
                        field.type === 'password' ? 'new-password' : undefined
                    }
                />
            );
    }

    return (
        <div className="grid gap-2">
            {field.type !== 'boolean' && (
                // biome-ignore lint/a11y/useKeyWithClickEvents: a pointer only; the keyboard reaches the dropdown itself
                <label
                    id={`${id}-label`}
                    htmlFor={id}
                    // a label opens a dropdown, as it focuses an input; the dropdown's button is no labelable element
                    onClick={(event) => {
                        const control = document.getElementById(id);

                        if (control?.tagName === 'SUMMARY') {
                            event.preventDefault();
                            control.click();
                        }
                    }}
                    className={`label ${required ? "after:ml-0.5 after:text-destructive after:content-['*']" : ''}`}
                >
                    {field.label}
                </label>
            )}
            {input}
            {field.help && (
                <p id={`${id}-help`} className="text-sm text-muted-foreground">
                    {field.help}
                </p>
            )}
            {invalid && (
                <ul
                    id={`${id}-errors`}
                    className="space-y-0.5 text-sm text-destructive"
                >
                    {errors.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
