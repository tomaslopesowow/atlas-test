/** What the api answers with, mirrored from its outputs. */

export interface MediaUrls {
    original: string;
    /** Each size's url, null until it is made. */
    conversions: Record<string, string | null>;
}

export interface UserSummary {
    id: number;
    name: string;
    avatar: MediaUrls | null;
}

export interface Profile extends UserSummary {
    createdAt: string;
}

export interface Me extends Profile {
    email: string;
    permissions: string[];
}

export interface Session {
    token: string;
    expiresAt: string;
    user: Me;
}

export interface PostImage {
    id: string;
    urls: MediaUrls;
}

export interface Post {
    id: number;
    author: UserSummary;
    body: string;
    images: PostImage[];
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LikeState {
    likeCount: number;
    likedByMe: boolean;
}

export interface Comment {
    id: number;
    postId: number;
    author: UserSummary;
    body: string;
    createdAt: string;
}

export interface Notification {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
}

export interface Role {
    id: number;
    name: string;
    permissions?: { id: number; name: string }[];
}

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

const TOKEN_KEY = 'atlas.token';

/** The session token, kept across reloads; storage can be unavailable, which only signs the user out. */
export const tokenStore = {
    get: (): string | null => {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    set: (token: string) => {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch {
            // kept for this page only
        }
    },
    clear: () => {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            // nothing stored
        }
    },
};

/** Fired when the api refuses the stored token, so the app can show the sign-in page. */
export const SIGNED_OUT = 'atlas:signed-out';

interface RequestOptions {
    method?: string;
    json?: unknown;
    form?: FormData;
}

// a validation error lists every problem; the rest carry one message
const messageOf = (body: unknown, status: number): string => {
    const message = (body as { message?: unknown } | undefined)?.message;

    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;

    return `Request failed (${status})`;
};

/** Calls the api with the session's token, resolving with its JSON or rejecting with an ApiError. */
export async function api<T>(
    path: string,
    { method = 'GET', json, form }: RequestOptions = {},
): Promise<T> {
    const token = tokenStore.get();
    const headers: Record<string, string> = {};

    if (token) headers.authorization = `Bearer ${token}`;
    if (json !== undefined) headers['content-type'] = 'application/json';

    const response = await fetch(`/api${path}`, {
        method,
        headers,
        body: json !== undefined ? JSON.stringify(json) : form,
    });

    if (response.status === 401 && token) {
        tokenStore.clear();
        window.dispatchEvent(new Event(SIGNED_OUT));
    }

    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : undefined;

    if (!response.ok)
        throw new ApiError(response.status, messageOf(body, response.status));

    return body as T;
}

/** A multipart body with the file in `file`, as the upload routes take it. */
export const fileForm = (file: File): FormData => {
    const form = new FormData();

    form.append('file', file);

    return form;
};

/** The size to show, falling back to the original while it is being made. */
export const imageUrl = (urls: MediaUrls, size: string): string =>
    urls.conversions[size] ?? urls.original;

/** The images the api accepts, as STORAGE_ALLOWED_MIME_TYPES has them by default. */
export const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

export const MAX_POST_IMAGES = 4;
