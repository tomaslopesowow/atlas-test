import {
    type AppLocale,
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
} from '@repo/i18n/shared';

export function getLocaleFromPathname(pathname: string): AppLocale {
    const maybeLocale = pathname.split('/')[0];

    // if the potential locale is in the list of locales, return it
    if (I18N_LOCALES.includes(maybeLocale as AppLocale)) {
        return maybeLocale as AppLocale;
    }

    // otherwise, return the default locale
    return I18N_DEFAULT_LOCALE;
}
