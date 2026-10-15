import { cn } from '@/components/utils/ui';
import { Slot } from '@radix-ui/react-slot';
import type {
    ComponentProps,
    JSX,
    JSXElementConstructor,
    PropsWithChildren,
} from 'react';

export type AdaptiveComponentType =
    // biome-ignore lint/suspicious/noExplicitAny: allow any
    JSXElementConstructor<any> | keyof JSX.IntrinsicElements;

export type AdaptiveComponentParams<TComponent extends AdaptiveComponentType> =
    {
        defaultComponent?: TComponent;
        defaultProps?: Partial<ComponentProps<TComponent>>;
        render?: (children: React.ReactNode) => React.ReactNode;
    };

export type AdaptiveComponent<TDefaultComponent extends AdaptiveComponentType> =
    <TComponent extends AdaptiveComponentType = TDefaultComponent>(
        props: Omit<ComponentProps<TComponent>, 'as'> & {
            as?: TComponent;
            asChild?: boolean;
        },
    ) => React.ReactNode;

export const createAdaptiveComponent = <
    TComponent extends AdaptiveComponentType,
>({
    defaultComponent,
    defaultProps,
    render,
}: AdaptiveComponentParams<TComponent>): AdaptiveComponent<TComponent> =>
    (({
        asChild,
        children,
        as = defaultComponent ?? 'div',
        ...props
    }: PropsWithChildren<{
        asChild?: boolean;
        as?: AdaptiveComponentType;
        className?: string;
    }>): React.ReactNode => {
        const Comp = asChild ? Slot : as;

        return (
            <Comp
                {...defaultProps}
                {...props}
                className={cn(defaultProps?.className, props.className)}
            >
                {render ? render(children) : children}
            </Comp>
        );
    }) as AdaptiveComponent<TComponent>;
