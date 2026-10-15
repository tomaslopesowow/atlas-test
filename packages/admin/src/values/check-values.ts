import type { FieldSchema, RecordInput } from '@repo/admin-contract';
import type { Field } from '../fields/field.js';
import { dayStart } from '../utils.js';

// dot-free labels between the dots, so a long run of dots cannot make the match backtrack quadratically
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
// a day no calendar has, such as 2026-13-01, is refused rather than thrown on
const isValidDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && dayStart(value) !== undefined;

/** What is wrong with a given, non-null value of the field's type, and the value its column takes. */
function checkType(
    schema: FieldSchema,
    value: unknown,
): { error?: string; value?: unknown } {
    const { label, type } = schema;

    switch (type) {
        case 'id':
            return typeof value === 'string' || typeof value === 'number'
                ? { value }
                : { error: `${label} must be a string or a number` };
        case 'text':
        case 'textarea':
        case 'password':
            return typeof value === 'string'
                ? { value }
                : { error: `${label} must be text` };
        case 'email':
            return typeof value === 'string' && EMAIL.test(value)
                ? { value }
                : { error: `${label} must be an email address` };
        case 'number':
            if (typeof value !== 'number' || !Number.isFinite(value))
                return { error: `${label} must be a number` };
            return schema.constraints?.integer && !Number.isInteger(value)
                ? { error: `${label} must be a whole number` }
                : { value };
        case 'boolean':
            return typeof value === 'boolean'
                ? { value }
                : { error: `${label} must be true or false` };
        case 'date':
            return typeof value === 'string' && isValidDate(value)
                ? { value }
                : { error: `${label} must be a date, as 2026-10-08` };
        case 'datetime':
            return typeof value === 'string' && !Number.isNaN(Date.parse(value))
                ? { value: new Date(value) }
                : { error: `${label} must be a date and time` };
        case 'select':
            return schema.options?.some((option) => option.value === value)
                ? { value }
                : { error: `${label} must be one of the options` };
        case 'json':
            return { value };
        case 'belongsTo':
            return typeof value === 'string' || typeof value === 'number'
                ? { value }
                : { error: `${label} must be the key of a record` };
        // what the upload endpoint returned, or whatever a custom component edits
        case 'file':
        case 'custom':
            return { value };
        case 'hasMany':
        case 'belongsToMany':
            return {
                error: `${label} is changed by attaching and detaching records`,
            };
    }
}

function checkLimits(schema: FieldSchema, value: unknown): string | undefined {
    const { label, constraints: limits = {} } = schema;

    if (typeof value === 'number') {
        if (limits.min !== undefined && value < limits.min)
            return `${label} must be at least ${limits.min}`;
        if (limits.max !== undefined && value > limits.max)
            return `${label} must be at most ${limits.max}`;
    }

    if (typeof value === 'string') {
        if (limits.minLength !== undefined && value.length < limits.minLength)
            return `${label} must be at least ${limits.minLength} characters`;
        if (limits.maxLength !== undefined && value.length > limits.maxLength)
            return `${label} must be at most ${limits.maxLength} characters`;
    }

    return undefined;
}

/**
 * The input's values for the fields a create or update may write, checked and converted for their
 * columns; anything else in the input is ignored, so a request can set no column the resource hides.
 */
export function checkValues({
    fields,
    input,
    creating,
}: {
    fields: { field: Field; schema: FieldSchema }[];
    input: RecordInput;
    creating: boolean;
}): {
    /** By property, converted for the columns, e.g. a datetime as a Date. */
    values: Record<string, unknown>;
    errors: Record<string, string[]>;
} {
    const values: Record<string, unknown> = {};
    const errors: Record<string, string[]> = {};

    for (const { field, schema } of fields) {
        const shown = creating
            ? schema.visibility.create
            : schema.visibility.update;

        if (!field.isWritable || !shown) continue;

        const given = input[field.name];
        const fail = (error: string) => {
            errors[field.name] = [...(errors[field.name] ?? []), error];
        };

        if (given === undefined) {
            if (creating && schema.required)
                fail(`${schema.label} is required`);
            continue;
        }

        if (given === null || (given === '' && schema.required)) {
            if (given === null && schema.nullable && !schema.required)
                values[field.name] = null;
            else fail(`${schema.label} is required`);
            continue;
        }

        const { error, value } = checkType(schema, given);

        if (error) {
            fail(error);
            continue;
        }

        const problems = [
            checkLimits(schema, given),
            ...field.validators.map((rule) => rule(given)),
        ].filter((problem) => problem !== undefined);

        if (problems.length) for (const problem of problems) fail(problem);
        else values[field.name] = value;
    }

    return { values, errors };
}
