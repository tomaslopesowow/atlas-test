/**
 * Type-safe utility function to create a new object with specified keys omitted
 * @param obj The source object
 * @param keys Keys to omit from the object
 * @returns A new object with the specified keys omitted
 */
export const objectOmit = <T extends object, K extends keyof T>(
    obj: T,
    ...keys: K[]
): Omit<T, K> => {
    const result = { ...obj };
    for (const key of keys) delete result[key];
    return result;
};
