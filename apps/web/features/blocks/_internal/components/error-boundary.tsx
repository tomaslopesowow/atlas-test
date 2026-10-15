'use client';

import { ErrorBoundary } from 'react-error-boundary';
import type { BlocksRegistryNamespace } from '../registry.js';

export type BlockErrorBoundaryProps = React.PropsWithChildren<{
    namespace?: BlocksRegistryNamespace;
    identifier?: string;
    error?: Error;
}>;

const BlockErrorBoundaryFallback = ({
    namespace,
    identifier,
    error,
}: BlockErrorBoundaryProps): React.ReactNode => {
    return process.env.NODE_ENV === 'development' ? (
        <div className="text-xl p-4 bg-red-500 text-white gap-2 flex flex-col">
            <p>Block failed to render. Check console for more details.</p>

            <div
                className="grid gap-x gap-y-2 text-base"
                style={{ gridTemplateColumns: 'auto 1fr' }}
            >
                <p>Namespace:</p>
                <span className="font-mono">{namespace}</span>

                <p>Identifier:</p>
                <span className="font-mono">{identifier}</span>

                <p>Message:</p>
                <span className="font-mono">{error?.toString()}</span>
            </div>
        </div>
    ) : null;
};

export const BlockErrorBoundary = ({
    children,
    namespace,
    identifier,
}: BlockErrorBoundaryProps) => {
    return (
        <ErrorBoundary
            fallbackRender={({ error }) => (
                <BlockErrorBoundaryFallback
                    namespace={namespace}
                    identifier={identifier}
                    error={error}
                />
            )}
        >
            {children}
        </ErrorBoundary>
    );
};
