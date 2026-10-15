import type {
    ActionResponse,
    ActivityResponse,
    AdminSchema,
    DashboardResponse,
    DeleteResponse,
    ListResponse,
    MeResponse,
    OptionsResponse,
    RecordInput,
    RecordKey,
    RecordResponse,
    SearchResponse,
    SessionInput,
    SessionResponse,
    UploadResponse,
    ValidationErrorResponse,
} from '@repo/admin-contract';
import { getToken, setToken, signOut } from './session';

// served by the API itself, so the panel and the API share an origin
const BASE = '/admin/api';

/** What the API answered with 404: a resource, record or page that is not there. */
export class NotFound extends Error {}

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

const resourcePath = (name: string) => `/resources/${encodeURIComponent(name)}`;

const recordPath = (name: string, key: RecordKey) =>
    `${resourcePath(name)}/${encodeURIComponent(key)}`;

/** The API's body, also for a status the caller handles itself; NotFound for a 404, an ApiError otherwise. */
async function request<T>(
    path: string,
    init: RequestInit = {},
    handled: number[] = [],
): Promise<T> {
    const token = getToken();
    const response = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            // fetch sets a form's multipart boundary itself
            ...(!(init.body instanceof FormData) && {
                'content-type': 'application/json',
            }),
            ...(token && { authorization: `Bearer ${token}` }),
        },
    });

    if (response.status === 401 && !handled.includes(401))
        signOut({ ended: true });

    const body = await response.json().catch(() => ({}));

    if (response.ok || handled.includes(response.status)) return body as T;
    if (response.status === 404) throw new NotFound(body.message);

    throw new ApiError(response.status, body.message ?? response.statusText);
}

// a refusal as a form shows it: by field, or as a message alone
const refusal = (body: {
    message?: string;
    errors?: Record<string, string[]>;
}) => ({
    message: body.message ?? 'Some values are not valid',
    errors: body.errors ?? {},
});

/** Ends the session on the API, so its token stops working, then forgets it here, whether or not the API could. */
export async function endSession() {
    await request('/session', { method: 'DELETE' }, [401, 403]).catch(
        () => undefined,
    );
    signOut();
}

export const getSchema = () => request<AdminSchema>('/schema');

export const getMe = () => request<MeResponse>('/me');

/** Signs in with the app's own login, keeping its token; what went wrong otherwise. */
export async function signIn(input: SessionInput): Promise<string | null> {
    const body = await request<Partial<SessionResponse> & { message?: string }>(
        '/session',
        { method: 'POST', body: JSON.stringify(input) },
        [400, 401, 404],
    );

    if (!body.token) return body.message ?? 'Could not sign in';

    setToken(body.token);

    return null;
}

export const listRecords = (name: string, query: URLSearchParams) =>
    request<ListResponse>(`${resourcePath(name)}?${query}`);

export const getRecord = (name: string, key: string) =>
    request<RecordResponse>(recordPath(name, key));

/** The record as stored, or what is wrong with the values, by field or as a conflict. */
export async function saveRecord(
    name: string,
    key: RecordKey | null,
    values: RecordInput,
): Promise<RecordResponse | ValidationErrorResponse> {
    const body = await request<RecordResponse | ValidationErrorResponse>(
        key === null ? resourcePath(name) : recordPath(name, key),
        {
            method: key === null ? 'POST' : 'PATCH',
            body: JSON.stringify(values),
        },
        [409, 422],
    );

    return 'data' in body ? body : refusal(body);
}

/** Deletes records: a soft-deleting resource only marks them deleted, unless forced. */
export const deleteRecords = (name: string, keys: RecordKey[], force = false) =>
    request<DeleteResponse>(resourcePath(name), {
        method: 'DELETE',
        body: JSON.stringify({ keys, force }),
    });

export const restoreRecords = (name: string, keys: RecordKey[]) =>
    request(`${resourcePath(name)}/restore`, {
        method: 'POST',
        body: JSON.stringify({ keys }),
    });

/** A page of the activity log: a record's, a resource's, or everything. */
export const getActivity = ({
    resource,
    key,
    page = 1,
}: {
    resource?: string;
    key?: RecordKey;
    page?: number;
}) =>
    request<ActivityResponse>(
        key !== undefined && resource
            ? `${recordPath(resource, key)}/activity?page=${page}`
            : `/activity?${new URLSearchParams({ page: String(page), ...(resource && { resource }) })}`,
    );

export const listRelated = (
    name: string,
    key: RecordKey,
    field: string,
    query: URLSearchParams,
) =>
    request<ListResponse>(
        `${recordPath(name, key)}/relations/${encodeURIComponent(field)}?${query}`,
    );

export const findOptions = async (name: string, search: string) =>
    (
        await request<OptionsResponse>(
            `${resourcePath(name)}/options?${new URLSearchParams({ search })}`,
        )
    ).data;

export const linkRelated = (
    name: string,
    key: RecordKey,
    field: string,
    keys: RecordKey[],
    attaching: boolean,
) =>
    request(
        `${recordPath(name, key)}/relations/${encodeURIComponent(field)}/${attaching ? 'attach' : 'detach'}`,
        { method: 'POST', body: JSON.stringify({ keys }) },
    );

/** What the action said it did, or what is wrong with its fields' values. */
export const runAction = (
    name: string,
    action: string,
    keys: RecordKey[],
    values: RecordInput,
) =>
    request<ActionResponse | ValidationErrorResponse>(
        `${resourcePath(name)}/actions/${encodeURIComponent(action)}`,
        { method: 'POST', body: JSON.stringify({ keys, values }) },
        [422],
    );

// days such as 2026-10-01..2026-10-09, or a range of the picker; its default when none
const ranged = (range: string | undefined) =>
    range ? `?${new URLSearchParams({ range })}` : '';

export const getResourceCards = (resource: string, range: string | undefined) =>
    request<DashboardResponse>(
        `${resourcePath(resource)}/cards${ranged(range)}`,
    );

export const getDashboard = (range: string | undefined) =>
    request<DashboardResponse>(`/dashboard${ranged(range)}`);

/** Stores a file through a file field: the value to save in it, or what is wrong with the file. */
export async function uploadFile(
    name: string,
    field: string,
    file: File,
): Promise<UploadResponse | ValidationErrorResponse> {
    const body = new FormData();
    body.append('file', file);

    const result = await request<UploadResponse | ValidationErrorResponse>(
        `${resourcePath(name)}/files/${encodeURIComponent(field)}`,
        { method: 'POST', body },
        [413, 422],
    );

    // a file too large for the server comes back with a message only, which is the field's
    return 'data' in result
        ? result
        : refusal({
              ...result,
              errors: result.errors ?? { [field]: [result.message] },
          });
}

export const searchEverything = (q: string) =>
    request<SearchResponse>(`/search?${new URLSearchParams({ q })}`);
