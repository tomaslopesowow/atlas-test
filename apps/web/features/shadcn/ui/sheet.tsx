import * as DialogPrimitive from '@radix-ui/react-dialog';
import type * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import Heading, { type HeadingVariantProps } from '@/components/common/heading';
import { cn } from '@/features/shadcn/utils/ui';

const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
    <DialogPrimitive.Overlay
        className={cn(
            'fixed inset-0 z-30 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
            'backdrop-blur-xl backdrop-brightness-50',
            className,
        )}
        {...props}
    />
);

const sheetVariants = tv({
    base: 'fixed z-50 bg-primary transition ease-in-out',
    variants: {
        side: {
            top: 'inset-x-0 top-0 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
            bottom: 'inset-x-0 bottom-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            left: 'inset-y-0 left-0 h-full w-3/4 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
            right: 'inset-y-0 right-0 h-full w-full md:w-1/2 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            center: 'inset-0 flex flex-col items-center justify-center w-full max-w-4xl md:p-10 p-4 m-auto h-fit',
        },
    },
    compoundVariants: [
        {
            // Variants with slide animation
            side: ['top', 'bottom', 'left', 'right'],
            className:
                'data-[state=closed]:duration-700 data-[state=open]:duration-1000 data-[state=open]:animate-in data-[state=closed]:animate-out',
        },
        {
            // Variant with clip animation
            side: ['center'],
            className:
                'data-[state=closed]:animate-clip-to-center data-[state=open]:animate-clip-from-center',
        },
    ],
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
        className={cn('p-8 border-b border-primary', className)}
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
        className={cn('flex flex-col p-4 border-t border-secondary', className)}
        {...props}
    />
);

const SheetTitle = ({
    className,
    variant = 'base',
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title> & {
    variant?: HeadingVariantProps['variant'];
}) => (
    <Heading asChild variant={variant}>
        <DialogPrimitive.Title className={className} {...props} />
    </Heading>
);

const SheetDescription = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
    <DialogPrimitive.Description
        className={cn('text-sm text-body', className)}
        {...props}
    />
);

const Sheet = (props: DialogPrimitive.DialogProps) => (
    <DialogPrimitive.Root {...props} />
);

export {
    Sheet,
    SheetPortal,
    SheetOverlay,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetBody,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
};
