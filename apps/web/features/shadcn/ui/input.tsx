'use client';

import type * as React from 'react';
import { type ComponentPropsWithRef, isValidElement } from 'react';
import { cn } from '@/features/shadcn/utils/ui';

export type InputProps = ComponentPropsWithRef<'input'> & {
    inputClassName?: string;
    prepend?: React.ReactNode;
    append?: React.ReactNode;
    hasError?: boolean;
    info?: React.ReactNode;
};

export const Input = ({
    className,
    inputClassName,
    type,
    prepend,
    append,
    hasError,
    info,
    disabled,
    ref,
    ...props
}: InputProps) => {
    return (
        <div className={cn('flex flex-col relative', className)}>
            <div
                className={cn(
                    'flex items-center grow',
                    hasError && !disabled && 'border-danger',
                    disabled &&
                        'pointer-events-none !border-transparent !bg-secondary !text-disabled',
                )}
            >
                {prepend && (
                    <div
                        className={cn(
                            'flex items-center',
                            hasError && 'text-danger',
                            disabled && '!text-disabled',
                        )}
                    >
                        {prepend}
                    </div>
                )}

                <input
                    {...props}
                    ref={ref}
                    className={cn(
                        'peer',
                        'grow',
                        'text-body outline-none text-sm bg-transparent px-4 placeholder:text-placeholder disabled:placeholder:text-disabled leading-none',
                        disabled && 'text-disabled',
                        inputClassName,
                        hasError && 'border-danger',
                    )}
                    disabled={disabled}
                    type={type}
                />

                {append && (
                    <div
                        className={cn(
                            'flex items-center pr-4',
                            hasError && 'text-danger',
                            disabled && '!text-disabled',
                        )}
                    >
                        {append}
                    </div>
                )}
            </div>

            {info &&
                (isValidElement(info) ? (
                    info
                ) : (
                    <div
                        className={cn(
                            'text-2xs absolute top-[calc(100%+0.5rem)]',
                            hasError ? 'text-danger' : 'text-body',
                            disabled && '!text-disabled',
                        )}
                    >
                        {info}
                    </div>
                ))}
        </div>
    );
};

Input.displayName = 'Input';

export default Input;
