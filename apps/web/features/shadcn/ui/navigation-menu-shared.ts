import { tv } from 'tailwind-variants';

export const navigationMenuTriggerStyle = tv({
    base: 'group inline-flex h-10 w-max items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-white focus:bg-primary focus:text-white focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-primary/50 data-[state=open]:bg-primary/50',
});
