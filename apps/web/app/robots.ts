import { getSiteUrl } from '@/utils/get-site-url';
import config from '@payload-config';
import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';

type Rule = {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
    crawlDelay?: number;
};

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const [siteUrl, payload] = await Promise.all([
        getSiteUrl(),
        getPayload({ config }),
    ] as const);

    const customRules: Rule[] = [];

    if (process.env.ALLOW_ROBOTS === 'yes') {
        const payloadRules = await payload
            .find({
                collection: 'robots',
                limit: 1000,
            })
            .then((res) => res.docs);

        customRules.push(...(payloadRules as unknown as Rule[]));
    } else {
        customRules.push({
            userAgent: '*',
            disallow: ['/'],
        });
    }

    return {
        rules: [
            ...customRules,

            // always disallow system paths
            {
                userAgent: '*',
                disallow: ['/admin', '/api'],
            },
        ],

        sitemap: new URL('sitemap.xml', siteUrl).toString(),
    };
}
