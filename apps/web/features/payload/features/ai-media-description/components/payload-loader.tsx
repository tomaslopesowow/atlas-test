import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

// Payload's loading component
// https://github.com/payloadcms/payload/blob/1235a183fff0dd982ff6256d18c540e56b354e86/packages/ui/src/elements/Loading/index.tsx#L4
export const PayloadLoader = ({
    className,
}: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div className={cn('loading-overlay__bars', className)}>
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={String(index)} className={'loading-overlay__bar'} />
            ))}
        </div>
    );
};
