import { EXTENSIONS } from './types/types.js';

/** `image/png`: lower case, without parameters such as "; charset=utf-8". */
export function normalizeMimeType(mimeType: string): string {
    return (mimeType.split(';')[0] ?? '').trim().toLowerCase();
}

/** The extension a file of this type is stored with, if one can be derived. */
export function extensionFor(mimeType: string): string | undefined {
    const type = normalizeMimeType(mimeType);

    // own keys only, since the type comes from the client
    if (Object.hasOwn(EXTENSIONS, type)) return EXTENSIONS[type];

    return type.split('/')[1]?.replace(/[^a-z0-9]/g, '') || undefined;
}
