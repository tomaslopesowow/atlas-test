import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';
import type { ComponentProps } from 'react';

export const NavigationButton = ({
    children,
    className,
    ...props
}: ComponentProps<'button'>) => (
    <Button
        variant="secondary"
        size="none"
        className={cn('h-12 w-12 rounded-full pointer-events-auto', className)}
        {...props}
    >
        {children}
    </Button>
);
