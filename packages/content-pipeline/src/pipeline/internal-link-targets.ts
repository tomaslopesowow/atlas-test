/**
 * A linkable internal page: its title and a relative URL the writer agent can
 * drop straight into the article. Built from a published `pages` document — its
 * public path is computed by the collection (taxonomy type + overview page), so
 * we reuse that here rather than re-deriving routes.
 */
export type InternalLinkTarget = { title: string; url: string };

/** A published page as returned by the local API (the fields we read). */
type PageDoc = { title?: unknown; path?: unknown; permalink?: unknown };

/**
 * Builds a link target from a published page. Prefers the page's computed
 * `permalink` (absolute) reduced to its relative path; falls back to the
 * locale-prefixed `path`. Returns null when the page has neither a title nor a
 * resolvable URL.
 */
export function pageTarget(
    locale: string,
    doc: PageDoc,
): InternalLinkTarget | null {
    const title = typeof doc.title === 'string' ? doc.title.trim() : '';
    const url = relativeUrl(locale, doc);
    if (!title || !url) return null;
    return { title, url };
}

function relativeUrl(locale: string, doc: PageDoc): string | null {
    if (typeof doc.permalink === 'string' && doc.permalink) {
        try {
            return new URL(doc.permalink).pathname;
        } catch {
            // Not an absolute URL — fall through to the path-based form.
        }
    }
    if (typeof doc.path === 'string' && doc.path) {
        const path = doc.path.startsWith('/') ? doc.path : `/${doc.path}`;
        return `/${locale}${path}`.replace(/\/{2,}/g, '/');
    }
    return null;
}
