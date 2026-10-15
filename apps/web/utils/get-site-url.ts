import { headers } from 'next/headers';
import { cache } from 'react';

export const getSiteUrl = cache(async () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }

    try {
        const headersList = await headers();
        const host = headersList.get('host') ?? '';
        const protocol = headersList.get('x-forwarded-proto') ?? 'http';
        return `${protocol}://${host}`;
    } catch {
        return `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? '3000'}`;
    }
});
