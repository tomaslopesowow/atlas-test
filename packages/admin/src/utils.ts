/** `createdAt` or `created_at` as `Created at`. */
export const humanize = (name: string): string => {
    const words = name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .toLowerCase();

    return words.charAt(0).toUpperCase() + words.slice(1);
};

/** An English plural good enough for a default label; a resource sets its own when it is not. */
export const pluralize = (word: string): string => {
    if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;

    return `${word}s`;
};

/** `blog_post`, `BlogPost` or `Today's posts (€)` as `blog-post` and `todays-posts`. */
export const kebab = (name: string): string =>
    name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        // an accent dropped and an apostrophe joined, rather than each a dash
        .normalize('NFKD')
        .replace(/[\u0300-\u036f'\u2019]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

/** Its entries that are set, as a schema leaves out what is not. */
export const defined = <T extends object>(object: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined),
    ) as Partial<T>;

export const DAY = 86_400_000;

/** The start of a day such as `2026-10-09`, in UTC, or undefined for one no calendar has. */
export const dayStart = (date: string | undefined): number | undefined => {
    const time = Date.parse(`${date}T00:00:00Z`);

    return date === undefined ||
        Number.isNaN(time) ||
        new Date(time).toISOString().slice(0, 10) !== date
        ? undefined
        : time;
};
