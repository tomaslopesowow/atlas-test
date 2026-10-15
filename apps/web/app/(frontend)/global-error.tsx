'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
    error,
}: { error: NextError & { digest?: string } }) {
    useEffect(() => {
        import('@sentry/nextjs').then((Sentry) =>
            Sentry.captureException(error),
        );
    }, [error]);

    return (
        <html lang="en">
            <body>
                {/* biome-ignore lint/suspicious/noExplicitAny: NextJS expects `any` type */}
                <NextError statusCode={undefined as any} />
            </body>
        </html>
    );
}
