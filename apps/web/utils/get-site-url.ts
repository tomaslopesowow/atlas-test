import { headers } from 'next/headers';
import { cache } from 'react';

export const getSiteUrl = cache(async () => {
    const headersList = await headers();
    const host = headersList.get('host') ?? '';
    const protocol = headersList.get('x-forwarded-proto') ?? 'http';
    return `${protocol}://${host}`;
});
