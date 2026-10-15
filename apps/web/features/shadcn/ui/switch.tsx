import { cn } from '@/features/shadcn/utils/ui';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import type * as React from 'react';

const Switch = ({
    className,
    ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) => (
    <SwitchPrimitives.Root
        className={cn(
            'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-border8 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-border6',
            className,
        )}
        {...props}
    >
        <SwitchPrimitives.Thumb
            className={cn(
                'pointer-events-none block h-5 w-5 rounded-full bg-text-gray12 shadow-lg ring-0 transition-transform data-[state=checked]:bg-primary-contrast data-[state=checked]:translate-x-5 data-[state=unchecked]:bg-gray-interactive3 data-[state=unchecked]:translate-x-0',
            )}
        />
    </SwitchPrimitives.Root>
);

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
