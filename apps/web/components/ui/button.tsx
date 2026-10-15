import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { type VariantProps, tv } from 'tailwind-variants';

export const buttonVariants = tv(
    {
        base: [
            'inline-flex items-center whitespace-nowrap transition-colors text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none',
        ],
        variants: {
            variant: {
                default:
                    'bg-green-950 border-green-950 text-white hover:opacity-90',
                destructive:
                    'bg-destructive border-destructive text-destructive-foreground hover:bg-destructive/90 hover:border-destructive/90',
                outline:
                    'border border-green-1000 bg-background hover:bg-green-100',
                primary:
                    'bg-primary-lime border-primary text-green-1000 hover:bg-primary-lime/80 hover:border-lime/80',
                secondary:
                    'bg-secondary border-secondary text-secondary-foreground hover:bg-secondary/80 hover:border-secondary/80',
                ghost: 'border-transparent text-green-950',
                link: 'text-primary underline-offset-4 px-0 h-auto hover:underline',
            },
            size: {
                sm: 'h-9',
                md: 'h-10',
                lg: 'h-12 text-base',
            },
            fluidWidth: {
                sm: 'px-9',
                md: 'px-10',
                lg: 'px-11',
            },
            fixedWidth: {
                sm: 'w-9',
                md: 'w-10',
                lg: 'w-11',
            },
        },
        compoundVariants: [
            {
                variant: ['outline', 'primary', 'secondary', 'ghost'],
                className:
                    'justify-center rounded-md border focus-visible:ring-ring',
            },
        ],
    },
    { responsiveVariants: ['sm', 'md', 'lg'] },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export type ButtonProps = ComponentProps<'button'> &
    Omit<ButtonVariantProps, 'fluidWidth' | 'fixedWidth'> & {
        width?: 'fluid' | 'fixed';
        asChild?: boolean;
    };

export const Button = ({
    className,
    variant = 'outline',
    size = 'md',
    width = 'fluid',
    asChild = false,
    ref,
    ...props
}: ButtonProps) => {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            ref={ref}
            className={buttonVariants({
                size,
                fluidWidth: width === 'fluid' ? size : undefined,
                fixedWidth: width === 'fixed' ? size : undefined,
                variant,
                className,
            })}
            {...props}
        />
    );
};
