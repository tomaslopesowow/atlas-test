import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { type VariantProps, tv } from 'tailwind-variants';

export const buttonVariants = tv(
    {
        base: [
            'inline-flex items-center rounded-md transition-colors cursor-pointer',
            'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        ],
        variants: {
            variant: {
                default:
                    'bg-gray-text12 border-gray-text12 text-gray-contrast hover:bg-gray-text11 hover:border-gray-text11 active:bg-gray-solid10 active:border-gray-solid10 focus-visible:outline-gray-text12 dark:bg-white dark:border-white dark:text-gray-background1 dark:hover:bg-gray-text12 dark:hover:border-gray-text12 dark:active:bg-gray-text11 dark:active:border-gray-text11 dark:focus-visible:outline-white',
                'outline-default':
                    'border-gray-text12 text-gray-text12 hover:bg-gray-text12 hover:text-gray-contrast active:bg-gray-text11 active:border-gray-text11 active:text-gray-contrast focus-visible:outline-gray-text12',
                primary:
                    'bg-primary border-primary text-primary-contrast hover:bg-primary-solid10 hover:border-primary-solid10 active:bg-primary-text11 active:border-primary-text11 focus-visible:outline-primary',
                'outline-primary':
                    'border-primary text-gray-text12 hover:bg-primary hover:text-primary-contrast active:bg-primary-solid10 active:border-primary-solid10 active:text-primary-contrast focus-visible:outline-primary',
                ghost: 'focus-visible:outline-gray-text12',
                link: 'text-gray-text12 underline-offset-4 underline hover:text-primary active:text-primary-solid10 focus-visible:outline-gray-text12 focus-visible:no-underline',
            },
            size: {
                none: 'h-auto',
                sm: 'h-10',
                md: 'h-12',
                lg: 'h-16',
            },
            fluidWidth: {
                none: '',
                sm: 'px-6',
                md: 'px-8',
                lg: 'px-10',
            },
            fixedWidth: {
                none: '',
                sm: 'w-8',
                md: 'w-10',
                lg: 'w-12',
            },
        },
        compoundVariants: [
            {
                variant: [
                    'default',
                    'primary',
                    'outline-primary',
                    'outline-default',
                ],
                className:
                    'justify-center border-2 focus-visible:outline-offset-2 whitespace-nowrap',
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
    variant = 'default',
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
                size: size,
                fluidWidth: width === 'fluid' ? size : undefined,
                fixedWidth: width === 'fixed' ? size : undefined,
                variant,
                className,
            })}
            {...props}
        />
    );
};
