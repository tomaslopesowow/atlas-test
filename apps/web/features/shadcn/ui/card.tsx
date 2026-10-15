import { cn } from '@/features/shadcn/utils/ui';
import { Slot } from '@radix-ui/react-slot';
import type { JSXElementConstructor } from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    // biome-ignore lint/suspicious/noExplicitAny: allow any
    as?: JSXElementConstructor<any> | keyof JSX.IntrinsicElements;
    asChild?: boolean;
    withBorder?: boolean;
    withShadow?: boolean;
};

const Card = ({
    as,
    asChild,
    className,
    withBorder,
    withShadow,
    ...props
}: CardProps) => {
    const Comp = (asChild ? Slot : (as ?? 'div')) as 'div';

    return (
        <Comp
            className={cn(
                'rounded-md bg-gray-background2',
                {
                    'border border-gray-border6': withBorder,
                    'shadow-sm': withShadow,
                },
                className,
            )}
            {...props}
        />
    );
};

Card.displayName = 'Card';

const CardHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('flex flex-col gap-y-4', className)} {...props} />
);

CardHeader.displayName = 'CardHeader';

const CardTitle = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
        className={cn(
            'text-2xl font-semibold leading-none tracking-tight',
            className,
        )}
        {...props}
    />
);

CardTitle.displayName = 'CardTitle';

const CardDescription = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn('text-sm text-gray-text11', className)} {...props} />
);

CardDescription.displayName = 'CardDescription';

const CardContent = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn(className)} {...props} />
);

CardContent.displayName = 'CardContent';

const CardFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('flex items-center', className)} {...props} />
);

CardFooter.displayName = 'CardFooter';

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
};
