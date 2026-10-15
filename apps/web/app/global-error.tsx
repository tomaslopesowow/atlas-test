'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
    error,
}: { error: Error & { digest?: string } }) {
    useEffect(() => {
        // Log error - OpenTelemetry will automatically capture this
        console.error('Global error:', error);
    }, [error]);

    return (
        <html lang="en" data-global-error>
            <body>
                {/* `NextError` is the default Next.js error page component. Its type
                    definition requires a `statusCode` prop. However, since the App Router
                    does not expose status codes for errors, we simply pass 0 to render a
                    generic error message. */}
                <NextError statusCode={0} />
            </body>
        </html>
    );
}
