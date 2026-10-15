'use client';
import { type ComponentProps, useState } from 'react';
import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';

interface SegmentedControlProps<T extends string | number>
    extends Omit<ComponentProps<'div'>, 'onChange'> {
    onChange?: (value: T) => void;
    options: { label: string; value: T }[];
    value: T;
}

const ITEM_WIDTH_REM = 8;

export const SegmentedControl = <T extends string | number>({
    options,
    value,
    onChange,
    className,
    style,
    ...props
}: SegmentedControlProps<T>) => {
    const [activeIndex, setActiveIndex] = useState(
        options.findIndex((option) => option.value === value),
    );

    return (
        <div
            className={cn(
                'bg-invert p-[2px] h-12 flex z-30 relative',
                className,
            )}
            style={{
                ...style,
                width: `${ITEM_WIDTH_REM * options.length}rem`,
            }}
            {...props}
        >
            <div
                className="h-full bg-primary transition-transform duration-500"
                style={{
                    width: `${(1 / options.length) * 100}%`,
                    transform: `translateX(${activeIndex * 100}%)`,
                }}
            />

            {options.map((option, index) => (
                <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setActiveIndex(index);
                        onChange?.(option.value);
                    }}
                    className={cn(
                        'absolute h-full top-0 justify-center text-invert text-xs',
                        activeIndex === index && 'text-primary',
                    )}
                    style={{
                        width: `${(1 / options.length) * 100}%`,
                        left: `${(index / options.length) * 100}%`,
                    }}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
};
