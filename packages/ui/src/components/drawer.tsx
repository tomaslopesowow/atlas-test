import { cn } from '@repo/lib/utils/cn';
import type * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

const Drawer = ({
    shouldScaleBackground = true,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
    <DrawerPrimitive.Root
        shouldScaleBackground={shouldScaleBackground}
        {...props}
    />
);

Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = ({
    className,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) => (
    <DrawerPrimitive.Overlay
        className={cn('fixed inset-0 z-50 bg-gray-text12/80', className)}
        {...props}
    />
);

DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) => (
    <DrawerPortal>
        <DrawerOverlay />
        <DrawerPrimitive.Content
            className={cn(
                'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border border-gray-border6 bg-white',
                className,
            )}
            {...props}
        >
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-gray-background2" />
            {children}
        </DrawerPrimitive.Content>
    </DrawerPortal>
);

DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({
    className,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) => (
    <div
        className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
        {...props}
    />
);

DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({
    className,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) => (
    <div
        className={cn('mt-auto flex flex-col gap-2 p-4', className)}
        {...props}
    />
);

DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = ({
    className,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) => (
    <DrawerPrimitive.Title
        className={cn(
            'text-lg font-semibold leading-none tracking-tight',
            className,
        )}
        {...props}
    />
);

DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = ({
    className,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) => (
    <DrawerPrimitive.Description
        className={cn('text-sm text-gray-text11', className)}
        {...props}
    />
);

DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerPortal,
    DrawerTitle,
    DrawerTrigger,
};
