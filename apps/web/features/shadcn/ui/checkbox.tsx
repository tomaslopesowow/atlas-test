import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/features/shadcn/utils/ui';

const Checkbox = ({
    className,
    ref,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            'peer h-4 w-4 shrink-0 rounded-md border border-primary focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-white',
            className,
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator
            className={cn('flex items-center justify-center text-body')}
        >
            <Check className="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
