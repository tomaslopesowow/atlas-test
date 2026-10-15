import * as DialogPrimitive from '@radix-ui/react-dialog';
import type * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/utils/cn';

const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
    <DialogPrimitive.Overlay
        className={cn(
            'fixed inset-0 z-20 bg-gray-text12/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            className,
        )}
        {...props}
    />
);

const sheetVariants = tv({
    base: 'fixed z-20 bg-gray-background2 border-gray-border6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out',
    variants: {
        side: {
            top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
            bottom: 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
            right: 'inset-y-0 right-0 h-full w-1/2 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        },
    },
    defaultVariants: {
        side: 'right',
    },
});

interface SheetContentProps
    extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
        VariantProps<typeof sheetVariants> {}

const SheetContent = ({
    side = 'right',
    className,
    children,
    ...props
}: SheetContentProps) => (
    <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
            className={sheetVariants({ side, className })}
            {...props}
        >
            {children}
        </DialogPrimitive.Content>
    </SheetPortal>
);

const SheetHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <header
        className={cn('p-4 border-b border-gray-border6', className)}
        {...props}
    />
);

const SheetBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('flex flex-col flex-1 p-4', className)} {...props} />
);

const SheetFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'flex flex-col p-4 border-t border-gray-border6',
            className,
        )}
        {...props}
    />
);

const SheetTitle = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
    <DialogPrimitive.Title
        className={cn('text-lg font-semibold text-gray-text12', className)}
        {...props}
    />
);

const SheetDescription = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
    <DialogPrimitive.Description
        className={cn('text-sm text-gray-text11', className)}
        {...props}
    />
);

const Sheet = (props: DialogPrimitive.DialogProps) => (
    <DialogPrimitive.Root {...props} />
);

export {
    Sheet,
    SheetBody,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetOverlay,
    SheetPortal,
    SheetTitle,
    SheetTrigger,
};
