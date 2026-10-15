import { I18N_DEFAULT_LOCALE, I18N_LOCALE_PREFIX } from '@/shared';

/*
 * Determine the locale segment based on the I18N_LOCALE_PREFIX setting
 */
export const getLocalePath = (locale: string) => {
    switch (I18N_LOCALE_PREFIX) {
        case 'always':
            return locale;
        case 'as-needed':
            return locale === I18N_DEFAULT_LOCALE ? '' : locale;
        default:
            return '';
    }
};
