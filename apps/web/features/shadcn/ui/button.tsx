import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

export const buttonVariants = tv(
    {
        base: [
            'font-sweet-sans-pro text-sm inline-flex items-center transition-all duration-500 cursor-pointer w-fit leading-none uppercase',
            'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        ],
        variants: {
            variant: {
                primary:
                    'bg-invert text-invert pointer-fine:hover:bg-invert-secondary focus-visible:outline-primary',
                secondary:
                    'text-primary border-2 border-primary pointer-fine:hover:border-tertiary focus-visible:outline-primary',
                tertiary:
                    'text-body text-xs pointer-fine:hover:text-primary data-[active=true]:text-primary focus-visible:outline-primary before:content-[""] before:inline-block before:size-2 before:bg-invert before:mr-2 before:align-middle before:[clip-path:inset(0%_0%_0%_100%)] data-[active=true]:before:[clip-path:inset(0%_0%_0%_0%)] pointer-fine:hover:before:[clip-path:inset(0%_0%_0%_0%)] before:transition-all before:ease-out before:duration-500',
                ghost: 'focus-visible:outline-primary',
                link: 'text-primary group',
            },
            size: {
                none: 'p-0',
                sm: 'p-3',
                md: 'p-4',
                lg: 'px-5 py-4',
            },
        },
        compoundVariants: [
            {
                variant: ['primary', 'secondary', 'tertiary'],
                className:
                    'justify-center focus-visible:outline-offset-2 whitespace-nowrap disabled:opacity-30',
            },
        ],
    },
    { responsiveVariants: ['sm', 'md', 'lg'] },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type NonSlottableVariants = Extract<ButtonVariantProps['variant'], 'link'>;

type BaseButtonProps = Omit<ComponentProps<'button'>, 'className'> & {
    className?: string;
    size?: ButtonVariantProps['size'];
};

type LinkButtonProps = BaseButtonProps & {
    variant: NonSlottableVariants;
    asChild?: false;
};

type NonLinkButtonProps = BaseButtonProps & {
    variant?: Exclude<ButtonVariantProps['variant'], NonSlottableVariants>;
    asChild?: boolean;
};

export type ButtonProps = LinkButtonProps | NonLinkButtonProps;

export function Button({
    className,
    variant = 'secondary',
    size = 'lg',
    asChild = false,
    ref,
    children,
    ...props
}: ButtonProps) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            ref={ref}
            className={buttonVariants({
                size: size,
                variant,
                className,
            })}
            {...props}
        >
            {variant === 'link' ? (
                <div className="relative">
                    {children}
                    <div
                        className="w-0 h-px bg-text-primary transition-all duration-500 ease-out -bottom-1 absolute
                        group-focus-visible:w-full group-hover:w-full group-active:w-full pointer-coarse:w-full"
                    />
                </div>
            ) : (
                children
            )}
        </Comp>
    );
}
