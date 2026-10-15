import type { AdaptiveComponentType } from '@/components/utils/composition';
import { cn } from '@/components/utils/ui';
import { Slot } from '@radix-ui/react-slot';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    as?: AdaptiveComponentType;
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
    const Comp = asChild ? Slot : (as ?? 'div');

    return (
        <Comp
            className={cn(
                'rounded-lg bg-card text-card-foreground',
                { border: withBorder, 'shadow-sm': withShadow },
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
    <div className={cn('flex flex-col gap-y-4 p-6', className)} {...props} />
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
    <p className={className} {...props} />
);

CardDescription.displayName = 'CardDescription';

const CardContent = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('p-6 pt-0', className)} {...props} />
);

CardContent.displayName = 'CardContent';

const CardFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
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
