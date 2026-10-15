/**
 * Validates that a value exists in the given string array.
 * Returns the value if valid and included, otherwise falls back to the first element.
 */

export const includedOrFirst = (value: unknown, array: string[]) => {
    if (value == null) return array[0];
    if (typeof value !== 'string') return array[0];
    if (!array.includes(value)) return array[0];
    return value;
};
