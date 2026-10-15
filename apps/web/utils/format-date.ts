import type { Maybe } from './maybe';

export const formatDate = (date: Maybe<string>, locale: Maybe<string>) => {
    if (!date || !locale) return null;
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};
