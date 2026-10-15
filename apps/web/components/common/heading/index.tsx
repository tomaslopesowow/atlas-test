import { Slot } from '@radix-ui/react-slot';
import type { HTMLAttributes } from 'react';
import { type VariantProps, tv } from 'tailwind-variants';

export const headingVariants = tv(
    {
        base: 'font-medium !leading-[1.1]',
        variants: {
            variant: {
                'display-1': 'text-8xl',
                'display-2': 'text-6xl',
                'heading-1': 'text-5xl',
                'heading-2': 'text-4xl',
                'heading-3': 'text-3xl',
                'heading-4': 'text-2xl',
                'heading-5': 'text-xl',
                'heading-6': 'text-lg',
                base: 'uppercase text-sm',
            },
        },
        defaultVariants: {
            variant: 'heading-1',
        },
    },
    { responsiveVariants: ['sm', 'md', 'lg'] },
);

export type HeadingVariantProps = VariantProps<typeof headingVariants>;

export interface HeadingProps
    extends HTMLAttributes<HTMLHeadingElement>,
        HeadingVariantProps {
    as?: keyof HTMLElementTagNameMap;
    asChild?: boolean;
}

/**
 * Represents introductory content, typically a group of introductory or navigational aids. It may contain some heading elements but also a logo, a search form, an author name, and other elements.
 */
export const Heading = ({
    as = 'h2',
    variant,
    asChild,
    className,
    children,
    ...props
}: HeadingProps): React.ReactNode => {
    const Comp = (asChild ? Slot : as) as 'h2';

    return (
        <Comp {...props} className={headingVariants({ variant, className })}>
            {children}
        </Comp>
    );
};

export default Heading;
