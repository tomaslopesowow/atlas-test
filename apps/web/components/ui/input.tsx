'use client';

import { cn } from '@/components/utils/ui';
import type * as React from 'react';
import { type ComponentPropsWithRef, isValidElement } from 'react';

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
                    'flex h-14 items-center bg-slate-100',
                    'rounded-md',
                    hasError && !disabled && 'border-red-400 !bg-red-100',
                    disabled &&
                        'pointer-events-none !border-transparent !bg-slate-100 !text-slate-500',
                )}
            >
                {prepend && (
                    <div
                        className={cn(
                            'flex items-center pl-4',
                            hasError && 'text-red-400',
                            disabled && '!text-slate-500',
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
                            'text-slate-1000 outline-none text-sm bg-transparent px-4 py-3 placeholder:text-slate-600 disabled:placeholder:text-slate-500 h-[3.5rem] leading-none',
                            disabled && 'text-slate-500',
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
                            disabled && '!text-slate-500',
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
                            hasError ? 'text-red-400' : 'text-slate-600',
                            disabled && '!text-slate-500',
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
