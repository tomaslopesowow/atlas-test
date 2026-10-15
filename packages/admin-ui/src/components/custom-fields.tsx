import type { FieldSchema } from '@repo/admin-contract';
import { type ComponentType, useState } from 'react';

interface CustomInputProps {
    id: string;
    field: FieldSchema;
    /** The value as text, as the form submits it under the field's name. */
    value: string;
    invalid: boolean;
    describedBy?: string;
}

interface CustomField {
    /** Submits its value as text under the field's name; empty clears a nullable field. */
    Input: ComponentType<CustomInputProps>;
    Value: ComponentType<{ field: FieldSchema; value: unknown }>;
}

/** Custom fields' components by a field's `component`; the panel is built ahead of time, so a project adds its own here. */
export const CUSTOM_FIELDS: Record<string, CustomField> = {
    color: {
        Input: ColorInput,
        Value: ({ value }) =>
            typeof value === 'string' ? (
                <span className="inline-flex items-center gap-2">
                    <span
                        className="size-4 rounded-sm border"
                        style={{ background: value }}
                    />
                    {value}
                </span>
            ) : null,
    },
};

// a colour input always holds a colour, so the form submits its own value: empty until one is picked
function ColorInput({
    id,
    field,
    value,
    invalid,
    describedBy,
}: CustomInputProps) {
    const [color, setColor] = useState(value);

    return (
        <>
            <input
                id={id}
                type="color"
                value={color || '#000000'}
                onChange={(event) => setColor(event.currentTarget.value)}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
            />
            <input type="hidden" name={field.name} value={color} />
        </>
    );
}
