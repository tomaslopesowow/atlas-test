import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/utils/cn';

export type CardProps<T extends React.ElementType = 'div'> =
    React.ComponentPropsWithoutRef<T> & {
        as?: T;
        asChild?: boolean;
        withBorder?: boolean;
        withShadow?: boolean;
    };

const Card = <T extends React.ElementType = 'div'>({
    as,
    asChild,
    className,
    withBorder,
    withShadow,
    ...props
}: CardProps<T>) => {
    const Comp = asChild ? Slot : (as ?? 'div');

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
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
};
