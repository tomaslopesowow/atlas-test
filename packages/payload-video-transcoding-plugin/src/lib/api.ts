import type {
    ACL,
    ApiError,
    JobResponse,
    TranscodeRequest,
    TranscodeResponse,
    Variant,
} from './types';

interface Options {
    bucket: string;
    endpoint: string;
    acl?: ACL;
    webhook?: URL;
    credentials: Credentials;
}

interface Credentials {
    apiClientId: string;
    apiClientSecret: string;
}

export class VideoHostingError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class VideoHostingApi {
    private readonly bucket: string;
    private readonly endpoint: string;
    private readonly credentials: Credentials;
    private readonly acl?: ACL;
    private readonly webhook?: URL;

    constructor({ bucket, endpoint, credentials, acl, webhook }: Options) {
        this.bucket = bucket;
        this.endpoint = endpoint;
        this.credentials = credentials;
        this.acl = acl;
        this.webhook = webhook;
    }

    private async fetch(path: string, init?: RequestInit): Promise<Response> {
        const url = new URL(path, this.endpoint);
        const request = new Request(url, init);
        request.headers.append('Client-Id', this.credentials.apiClientId);
        request.headers.append(
            'Client-Secret',
            this.credentials.apiClientSecret,
        );

        try {
            return await fetch(request);
        } catch (e) {
            if (e instanceof Error) {
                throw new VideoHostingError(e.message, -1);
            }

            throw new VideoHostingError('Fetch request failed', -1);
        }
    }

    private async parse<T>(response: Response): Promise<T> {
        if (response.ok) {
            try {
                return await response.json();
            } catch (e) {
                if (e instanceof Error) {
                    throw new VideoHostingError(e.message, response.status);
                }

                throw new VideoHostingError(
                    'Failed to ready JSON body',
                    response.status,
                );
            }
        }

        try {
            const error: ApiError = await response.json();
            const lines = error.message.map((line) => `- ${line}`).join('\n');
            const message = `API Error: ${error.error}\n${lines}`.trim();
            throw new VideoHostingError(message, response.status);
        } catch (e) {
            if (e instanceof VideoHostingError) {
                throw e;
            }

            if (e instanceof Error) {
                throw new VideoHostingError(e.message, response.status);
            }

            throw new VideoHostingError(
                'Failed to parse JSON error body',
                response.status,
            );
        }
    }

    async transcode(
        file: string,
        variants: Variant[],
    ): Promise<TranscodeResponse> {
        const request: TranscodeRequest = {
            bucket: this.bucket,
            key: file,
            acl: this.acl,
            webhook: this.webhook?.toString(),
            variants,
        };
        const response = await this.fetch('/transcode', {
            method: 'POST',
            body: JSON.stringify(request),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        return await this.parse(response);
    }

    async job(id: string): Promise<JobResponse> {
        const response = await this.fetch(`/jobs/${id}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        return await this.parse(response);
    }
}
