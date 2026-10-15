import { I18N_LOCALES } from '@repo/i18n/shared';

export function getPathnameWithoutLocale(
    pathname: string,
    locales: string[] = I18N_LOCALES.slice(),
) {
    // Remove locale from pathname, so we can use it to fetch the page from payload
    let pathnameWithoutLocale = pathname
        .split('/') // split into segments
        .filter(Boolean) // remove empty segments -> result ["en", "segment"] or ["segment"]
        .filter((segment, index) => index !== 0 || !locales.includes(segment)) // filter locale from pathname
        .join('/'); // join segments back into a pathname

    // prepend leading slash and remove duplicate slashes
    pathnameWithoutLocale = `/${pathnameWithoutLocale}`.replace(/\/{2,}/g, '/');

    return pathnameWithoutLocale;
}
