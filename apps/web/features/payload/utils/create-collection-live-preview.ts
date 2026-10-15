import type { AppLocale } from '@repo/i18n/shared';
import type { LivePreviewConfig } from 'payload';

const breakpoints: LivePreviewConfig['breakpoints'] = [
    {
        label: 'Mobile',
        name: 'mobile',
        width: 375,
        height: 667,
    },
    {
        label: 'Tablet',
        name: 'tablet',
        width: 768,
        height: 1024,
    },
    {
        label: 'Desktop',
        name: 'desktop',
        width: 1440,
        height: 900,
    },
];

export const createCollectionLivePreview = <TDoc = Record<string, unknown>>(
    getUrl: (doc: TDoc, locale: AppLocale) => Promise<URL> | URL,
): LivePreviewConfig | undefined => {
    return {
        breakpoints,
        url: async ({ data, locale }) => {
            const url = await getUrl(data as TDoc, locale.code as AppLocale);
            url.searchParams.set('preview', 'live');
            return url.toString();
        },
    };
};
