import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { FieldHook } from 'payload';
import slugify from 'slugify';

const OPTIONS = {
    replacement: '-', // replace spaces with replacement character, defaults to `-`
    lower: true, // convert to lower case, defaults to `false`
    strict: true, // strip special characters except replacement, defaults to `false`
    trim: true, // trim leading and trailing replacement chars, defaults to `true`
};

export const formatSlug = (
    value: string,
    locale: string = I18N_DEFAULT_LOCALE,
): string => (value === '/' ? '/' : slugify(value, { ...OPTIONS, locale }));

export const formatSlugHook =
    (fallback: string): FieldHook =>
    ({ data, operation, value, req }) => {
        if (typeof value === 'string') {
            return formatSlug(value, req.locale);
        }

        if (operation === 'create' || !data?.slug) {
            const fallbackData = data?.[fallback] || data?.[fallback];

            if (fallbackData && typeof fallbackData === 'string') {
                return formatSlug(fallbackData);
            }
        }

        return value;
    };
