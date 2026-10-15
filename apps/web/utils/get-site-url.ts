import { headers } from 'next/headers';
import { cache } from 'react';

export const getSiteUrl = cache(async () => {
    try {
        const headersList = await headers();
        const host = headersList.get('host') ?? '';
        const protocol = headersList.get('x-forwarded-proto') ?? 'http';
        return `${protocol}://${host}`;
    } catch {
        // `headers()` throws when there is no request scope — e.g. a page read
        // or write that runs inside a Payload Jobs task or a CLI script (the
        // content pipeline creates draft pages from a scheduled job). Those
        // contexts still run the collection's afterRead hooks, so return a
        // valid placeholder base instead of throwing. URLs that are actually
        // served or persisted are always built in a request scope, so they are
        // unaffected by this fallback.
        return 'http://localhost';
    }
});
