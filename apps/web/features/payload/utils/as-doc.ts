/**
 * Checks if the document is a string (id reference) and returns null if it is,
 * otherwise returns the document.
 *
 * @param doc - The document to check.
 * @returns The document if it is not a string (id reference), otherwise null.
 */
export function asDoc<T>(doc: T) {
    if (typeof doc === 'string') return null;
    return (doc ?? null) as Exclude<T, string | undefined> | null;
}
