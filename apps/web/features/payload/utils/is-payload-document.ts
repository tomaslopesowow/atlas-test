/**
 * This function determines if the provided value is a payload document or an ID reference string. It returns undefined for an ID string reference, and the document itself otherwise.
 */
export function isPayloadDocument<T>(doc?: null | string | T): T | undefined {
    return doc ? (typeof doc === 'string' ? undefined : doc) : undefined;
}
