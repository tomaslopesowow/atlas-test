import { type AppLocale, I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { Payload } from 'payload';

/**
 * Uploads an image buffer to the `media` collection (Payload re-encodes it to
 * webp + responsive sizes via sharp) and sets the localized `description` — the
 * accessible alt text the post cover renders. Returns the new media id.
 *
 * Note: sharp re-encoding strips any C2PA manifest in the source bytes, so the
 * durable AI-provenance signal is the post's `aiGenerated` flag, not file
 * metadata (relevant to the deferred EU C2PA follow-up).
 */
export async function uploadImageAsMedia(
    payload: Payload,
    opts: {
        buffer: Buffer;
        mimetype: string;
        altByLocale: Partial<Record<AppLocale, string>>;
        baseName: string;
    },
): Promise<string> {
    const ext = opts.mimetype.split('/')[1]?.split('+')[0] ?? 'png';
    const name = `${opts.baseName}.${ext}`;

    const created = await payload.create({
        collection: 'media',
        locale: I18N_DEFAULT_LOCALE,
        file: {
            data: opts.buffer,
            mimetype: opts.mimetype,
            name,
            size: opts.buffer.byteLength,
        },
        data: {
            description: opts.altByLocale[I18N_DEFAULT_LOCALE],
        },
    });

    const id = String(created.id);

    // The media doc already exists; a failed localized-alt update must not throw
    // out of here (that would abandon the image and leave an orphan media doc).
    // Log and continue — the locale just keeps the default-locale alt text.
    for (const [locale, alt] of Object.entries(opts.altByLocale)) {
        if (locale === I18N_DEFAULT_LOCALE || !alt) continue;
        try {
            await payload.update({
                collection: 'media',
                id,
                locale: locale as AppLocale,
                data: { description: alt },
            });
        } catch (error) {
            payload.logger.warn(
                `Content pipeline: failed to set ${locale} alt text on media ${id} (${
                    error instanceof Error ? error.message : String(error)
                }) — keeping the image with default-locale alt only.`,
            );
        }
    }

    return id;
}
