export type PayloadFetchParams = Partial<RequestInit> & {
    query: string;
};

/**
 * Performs a fetch request to the Payload CMS endpoint with the specified query and initialization options.
 *
 * @param {string} query - The GraphQL query string to be sent to the CMS endpoint.
 * @param {RequestInit} [init={}] - The initialization options for the request, which may include custom headers and other request settings.
 * @returns {Promise<unknown>} A promise that resolves with the JSON response from the CMS endpoint.
 * @throws {PayloadFetchError} Throws an error if the fetch request fails.
 */
export async function payloadFetch<
    T extends Record<string, unknown> = Record<string, unknown>,
>(query: string, { headers, ...init }: RequestInit = {}): Promise<T> {
    const result = await fetch(
        new URL(query, process.env.PAYLOAD_CMS_ENDPOINT ?? ''),
        {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        },
    )
        .then((response) => response.json())
        .catch((error) => {
            throw new PayloadFetchError(query, error);
        });

    return result;
}

export class PayloadFetchError extends Error {
    constructor(
        public query: string,
        public error: unknown,
    ) {
        super();
    }
}
