// constants
export type LocalePrefix = 'never' | 'always' | 'as-needed';
export const I18N_LOCALES = ['en', 'nl'] as const;
export const I18N_DEFAULT_LOCALE: AppLocale = 'en';
export const I18N_LOCALE_PREFIX: LocalePrefix = 'always';

// utils

export type AppLocale = (typeof I18N_LOCALES)[number];

export const getAlternateLocales = (locale: AppLocale) =>
    I18N_LOCALES.filter((l) => l !== locale);

export const checkLocaleValidity = (locale: string): locale is AppLocale =>
    I18N_LOCALES.includes(locale as AppLocale);
