'use client';

import type * as React from 'react';
import { type ComponentPropsWithRef, isValidElement } from 'react';
import { cn } from '@/utils/cn';

export type InputProps = ComponentPropsWithRef<'input'> & {
    prepend?: React.ReactNode;
    append?: React.ReactNode;
    hasError?: boolean;
    info?: React.ReactNode;
};

export const Input = ({
    className,
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
        <div>
            <div
                className={cn(
                    'flex h-14 items-center bg-gray-background2',
                    'rounded-md',
                    hasError && !disabled && 'border-red-400 !bg-red-100',
                    disabled &&
                        'pointer-events-none !border-transparent !bg-gray-background2 !text-gray-border8',
                )}
            >
                {prepend && (
                    <div
                        className={cn(
                            'flex items-center pl-4',
                            hasError && 'text-red-400',
                            disabled && '!text-gray-border8',
                        )}
                    >
                        {prepend}
                    </div>
                )}

                <div className="relative flex grow items-center">
                    <input
                        ref={ref}
                        className={cn(
                            'peer',
                            'grow',
                            'text-gray-text12 outline-none text-sm bg-transparent px-4 py-3 placeholder:text-gray-text11 disabled:placeholder:text-gray-border8 h-[3.5rem] leading-none',
                            disabled && 'text-gray-border8',
                        )}
                        disabled={disabled}
                        type={type}
                        {...props}
                    />
                </div>

                {append && (
                    <div
                        className={cn(
                            'flex items-center pr-4',
                            hasError && 'text-red-400',
                            disabled && '!text-gray-border8',
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
                            'mt-2 text-xs',
                            hasError ? 'text-red-400' : 'text-gray-text12',
                            disabled && '!text-gray-border8',
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
