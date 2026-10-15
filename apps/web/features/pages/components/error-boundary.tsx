'use client';

import { ErrorBoundary } from 'react-error-boundary';

export type PageErrorBoundaryProps = React.PropsWithChildren<{
    identifier?: string;
    componentStack?: string;
    error?: unknown;
}>;

const PageErrorBoundaryFallback = ({
    identifier,
    error,
}: PageErrorBoundaryProps): React.ReactNode => {
    return process.env.NODE_ENV === 'development' ? (
        <div className="flex flex-col gap-2 bg-red-500 p-4 text-xl text-white">
            <p>Page failed to render. Check console for more details.</p>

            <div
                className="grid gap-x gap-y-2 text-base"
                style={{ gridTemplateColumns: 'auto 1fr' }}
            >
                <p>Identifier:</p>
                <span className="font-mono">{identifier}</span>

                <p>Message:</p>
                <span className="font-mono">{error?.toString()}</span>
            </div>
        </div>
    ) : null;
};

export const PageErrorBoundary = ({
    children,
    identifier,
}: PageErrorBoundaryProps) => {
    return (
        <ErrorBoundary
            fallbackRender={({ error }) => (
                <PageErrorBoundaryFallback
                    error={error}
                    identifier={identifier}
                />
            )}
        >
            {children}
        </ErrorBoundary>
    );
};
