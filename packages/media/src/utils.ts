import type { Metadata } from 'sharp';

// mime types whose extension is not simply their subtype
const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
};

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

/** The mime type of an image as sharp read it. */
export function imageMimeType({ format, compression }: Metadata): string {
    if (format === 'heif')
        return compression === 'av1' ? 'image/avif' : 'image/heic';
    if (format === 'svg') return 'image/svg+xml';

    return `image/${format}`;
}
