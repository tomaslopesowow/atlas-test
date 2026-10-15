import * as LabelPrimitive from '@radix-ui/react-label';
import { tv } from 'tailwind-variants';

const labelVariants = tv({
    base: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
});

const Label = ({
    className,
    ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) => (
    <LabelPrimitive.Root className={labelVariants({ className })} {...props} />
);

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
