import { Play } from 'lucide-react';
import type { ComponentProps } from 'react';
import { type VariantProps, tv } from 'tailwind-variants';

const playButtonVariants = tv({
    base: 'flex items-center justify-center rounded-full overflow-visible',
    variants: {
        variant: {
            dark: 'backdrop-blur-md backdrop-brightness-50 text-white',
            light: 'bg-white shadow-md',
        },
        size: {
            sm: 'size-6 lg:size-10 p-2 lg:p-4',
            md: 'size-14 p-5',
            lg: 'size-16 p-6',
        },
    },
    defaultVariants: {
        variant: 'dark',
        size: 'sm',
    },
});

export type PlayButtonVariantProps = VariantProps<typeof playButtonVariants>;

export type PlayButtonProps = ComponentProps<'svg'> & PlayButtonVariantProps;

export const PlayButton = ({
    className,
    variant,
    size,
    ...props
}: PlayButtonProps) => {
    return (
        <Play
            {...props}
            className={playButtonVariants({ variant, size, className })}
        />
    );
};
