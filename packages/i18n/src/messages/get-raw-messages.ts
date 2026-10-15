import type { AppLocale } from '@/shared';

export const getRawMessages = async (locale: AppLocale) => {
    return (await import(`./${locale}.json`)).default;
};
