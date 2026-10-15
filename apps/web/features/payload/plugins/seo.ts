import type { SEOPluginConfig } from '@payloadcms/plugin-seo/types';
import { getSiteUrl } from '@/utils/get-site-url';

export const seoPluginConfig: SEOPluginConfig = {
    interfaceName: 'SEOMeta',

    generateTitle: async ({ doc, req, collectionConfig, globalConfig }) => {
        const brand = await req.payload.findGlobal({ slug: 'brand' });

        if (collectionConfig?.slug === 'pages') {
            return [doc?.title, brand?.name].filter(Boolean).join(' | ');
        }

        if (globalConfig?.slug === 'brand') {
            return brand?.name ?? '';
        }

        return '';
    },

    generateURL: async ({ doc, collectionConfig }) => {
        if (collectionConfig?.slug === 'pages') {
            return doc.permalink;
        }

        return getSiteUrl();
    },
};
