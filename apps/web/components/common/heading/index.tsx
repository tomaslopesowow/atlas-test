import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps, ReactNode } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import type { SerializedEditorNode } from '../../content/custom-lexical-node';
import { renderLexicalSimple } from '../../content/render-lexical-simple';

export const headingVariants = tv(
    {
        base: 'font-serif',
        variants: {
            variant: {
                'display-1':
                    'text-7xl lg:text-8xl xl:text-10xl font-thin leading-none',
                'display-2':
                    'text-5xl md:text-7xl lg:text-8xl xl:text-10xl font-thin leading-none',
                'heading-1':
                    'text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-light leading-tight',
                'heading-2':
                    'text-4xl md:text-6xl lg:text-7xl font-light leading-tight',
                'heading-3': 'text-4xl md:text-6xl font-thin leading-snug',
                'heading-4': 'text-3xl md:text-5xl font-light leading-snug',
                'heading-5': 'text-3xl md:text-4xl font-light leading-snug',
                'heading-6': 'text-2xl md:text-3xl font-light leading-snug',
                'heading-7': 'text-2xl font-light leading-snug',
                'heading-8': 'text-xl font-light leading-snug',
                'heading-slogan':
                    'text-3xl md:text-5xl font-thin leading-tight',
                base: 'text-sm font-sweet-sans-pro uppercase',
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
    extends Omit<ComponentProps<'h1'>, 'children'>,
        HeadingVariantProps {
    as?: keyof HTMLElementTagNameMap;
    asChild?: boolean;
    children?: ReactNode | { root: { children: SerializedEditorNode[] } };
}

export const Heading = ({
    as = 'h2',
    variant,
    asChild,
    className,
    children,
    ref,
    ...props
}: HeadingProps): React.ReactNode => {
    const Comp = (asChild ? Slot : as) as 'h2';

    const renderChildren = (): ReactNode => {
        return renderLexicalSimple(children);
    };

    return (
        <Comp
            {...props}
            ref={ref}
            className={headingVariants({ variant, className })}
        >
            {renderChildren()}
        </Comp>
    );
};

export default Heading;
