const BASE_URL = 'https://api.dataforseo.com/v3';
const MAX_ATTEMPTS = 3;
const OK_JSON_STATUS_CODE = 20000;

type DataForSeoResponse<TResult> = {
    status_code: number;
    status_message: string;
    cost: number;
    tasks: Array<{
        status_code: number;
        status_message: string;
        result: TResult[] | null;
    }> | null;
};

export type DataForSeoClient = {
    live<TResult>(
        path: string,
        task: Record<string, unknown>,
    ): Promise<{ result: TResult[]; cost: number }>;
};

export type DataForSeoClientOptions = {
    login: string;
    password: string;
    fetch?: typeof globalThis.fetch;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createDataForSeoClient({
    login,
    password,
    fetch: fetchImpl = globalThis.fetch,
}: DataForSeoClientOptions): DataForSeoClient {
    const authorization = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;

    return {
        async live<TResult>(path: string, task: Record<string, unknown>) {
            let response: Response | undefined;

            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
                response = await fetchImpl(`${BASE_URL}${path}`, {
                    method: 'POST',
                    headers: {
                        Authorization: authorization,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify([task]),
                });

                const transient =
                    response.status === 429 || response.status >= 500;
                if (!transient || attempt === MAX_ATTEMPTS) break;
                await sleep(500 * 2 ** (attempt - 1));
            }

            if (!response?.ok) {
                throw new Error(`DataForSEO ${path} HTTP ${response?.status}`);
            }

            const json = (await response.json()) as DataForSeoResponse<TResult>;

            if (json.status_code !== OK_JSON_STATUS_CODE) {
                throw new Error(
                    `DataForSEO ${path} error ${json.status_code}: ${json.status_message}`,
                );
            }

            const firstTask = json.tasks?.[0];
            if (!firstTask || firstTask.status_code !== OK_JSON_STATUS_CODE) {
                throw new Error(
                    `DataForSEO ${path} task error ${firstTask?.status_code}: ${firstTask?.status_message}`,
                );
            }

            return { result: firstTask.result ?? [], cost: json.cost };
        },
    };
}
