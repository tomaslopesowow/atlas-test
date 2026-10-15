'use client';

import { Slot } from '@radix-ui/react-slot';
import { usePathname } from 'next/navigation';
import {
    type ComponentProps,
    type DependencyList,
    type PropsWithChildren,
    useRef,
} from 'react';
import { useMotion } from '../hooks/use-motion';

type HoverGroupItemProps = PropsWithChildren<{ asChild?: boolean }>;

export const HoverGroupItem = ({
    children,
    asChild = true,
    ...props
}: HoverGroupItemProps) => {
    const Comp = asChild ? Slot : 'div';
    return <Comp {...props}>{children}</Comp>;
};

type HoverGroupProps = ComponentProps<'div'> & {
    dependencies?: DependencyList | DependencyList[number];
};

const OPACITY_DURATION_SECONDS = 0.5;
const OPACITY_EASE = 'power2.out';

export const HoverGroup = ({
    children,
    dependencies,
    ...props
}: HoverGroupProps) => {
    const groupRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const additionalDependencies = [dependencies].flat();

    useMotion(
        ([{ default: gsap }]) => {
            const group = groupRef.current;
            if (!group) return;

            const items: Element[] = gsap.utils.toArray(group.children);

            const context = gsap.context(() => {
                group.addEventListener('mouseleave', () => {
                    gsap.to(items, {
                        opacity: 1,
                        ease: OPACITY_EASE,
                        duration: OPACITY_DURATION_SECONDS,
                    });
                });

                for (const item of items) {
                    item.addEventListener('mouseenter', () => {
                        gsap.to(items, {
                            opacity: 0.2,
                            ease: OPACITY_EASE,
                            duration: OPACITY_DURATION_SECONDS,
                        });

                        gsap.to(item, {
                            opacity: 1,
                            ease: OPACITY_EASE,
                            duration: OPACITY_DURATION_SECONDS,
                        });
                    });
                }
            });

            return () => {
                context.revert();
            };
        },
        {
            load: { when: 'load' },
            mediaQueryList: () => matchMedia('(pointer: fine)'),
            loader: () => [import('gsap')] as const,
        },
        [pathname, ...additionalDependencies],
    );

    return (
        <div ref={groupRef} {...props}>
            {children}
        </div>
    );
};
