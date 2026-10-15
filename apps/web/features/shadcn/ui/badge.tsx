import type * as React from 'react';
import { type VariantProps, tv } from 'tailwind-variants';

const badgeVariants = tv({
    base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold transition-colors border focus:outline-2 focus:outline-offset-2',
    variants: {
        variant: {
            default:
                'border-transparent bg-gray-text12 text-gray-contrast hover:bg-gray-text11 focus-visible:outline-gray-text12',
            primary:
                'border-transparent bg-primary text-primary-contrast hover:bg-primary-solid10 hover:border-primary-solid10 focus-visible:outline-primary',
            destructive:
                'border-transparent bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-500',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={badgeVariants({ variant, className })} {...props} />;
}

export { Badge, badgeVariants };
export default Badge;
