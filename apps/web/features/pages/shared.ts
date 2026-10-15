import type { AppLocale } from '@repo/i18n/shared';

export type AnyPageParams = {
    rest?: string[];
    locale: AppLocale;
};

export type AnyPageProps = {
    params: Promise<AnyPageParams>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
