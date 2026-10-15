import {
    SliderRange,
    Root as SliderRoot,
    SliderThumb,
    SliderTrack,
} from '@radix-ui/react-slider';
import type { ComponentProps } from 'react';
import { cn } from '@/features/shadcn/utils/ui';

interface SliderProps extends ComponentProps<typeof SliderRoot> {
    isRange: boolean;
}

export const Slider = ({
    min,
    max,
    isRange = false,
    className,
    ...props
}: SliderProps) => {
    return (
        <SliderRoot
            {...props}
            min={min}
            max={max}
            className={cn(
                'relative flex h-6 w-full touch-none select-none items-center',
                className,
            )}
        >
            <SliderTrack className="relative h-[2px] grow rounded-full bg-border-primary cursor-pointer">
                <SliderRange className="absolute h-full bg-invert" />
            </SliderTrack>
            <SliderThumb className="block size-6 rounded-full border border-primary bg-primary cursor-grab active:cursor-grabbing" />
            {isRange && (
                <SliderThumb className="block size-6 rounded-full border border-primary bg-primary cursor-grab active:cursor-grabbing" />
            )}
        </SliderRoot>
    );
};
