import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { ChevronDown } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/components/utils/ui';
import { navigationMenuTriggerStyle } from './navigation-menu-shared';

export const NavigationMenu = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) => (
    <NavigationMenuPrimitive.Root
        className={cn(
            'relative z-10 flex max-w-max flex-1 items-center justify-center',
            className,
        )}
        {...props}
    >
        {children}
        <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
);

NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

export const NavigationMenuList = ({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) => (
    <NavigationMenuPrimitive.List
        className={cn(
            'group flex flex-1 list-none items-center justify-center space-x-1',
            className,
        )}
        {...props}
    />
);

NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

export const NavigationMenuItem = NavigationMenuPrimitive.Item;

export const NavigationMenuTrigger = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) => (
    <NavigationMenuPrimitive.Trigger
        className={cn(navigationMenuTriggerStyle(), 'group', className)}
        {...props}
    >
        {children}{' '}
        <ChevronDown
            aria-hidden="true"
            className="relative top-[1px] ml-1 size-3 transition duration-200 group-data-[state=open]:rotate-180"
        />
    </NavigationMenuPrimitive.Trigger>
);

NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

export const NavigationMenuContent = ({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) => (
    <NavigationMenuPrimitive.Content
        className={cn(
            'left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ',
            className,
        )}
        {...props}
    />
);

NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

export const NavigationMenuLink = NavigationMenuPrimitive.Link;

export const NavigationMenuViewport = ({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) => (
    <div className={cn('absolute left-0 top-full flex justify-center')}>
        <NavigationMenuPrimitive.Viewport
            className={cn(
                'origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]',
                className,
            )}
            {...props}
        />
    </div>
);

NavigationMenuViewport.displayName =
    NavigationMenuPrimitive.Viewport.displayName;

export const NavigationMenuIndicator = ({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) => (
    <NavigationMenuPrimitive.Indicator
        className={cn(
            'top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in',
            className,
        )}
        {...props}
    >
        <div className="relative top-[60%] size-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
    </NavigationMenuPrimitive.Indicator>
);

NavigationMenuIndicator.displayName =
    NavigationMenuPrimitive.Indicator.displayName;
