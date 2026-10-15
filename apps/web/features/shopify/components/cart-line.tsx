'use client';

import { Slot } from '@radix-ui/react-slot';
import {
    Image as HydrogenImage,
    Money,
    useCart,
    useCartLine,
} from '@shopify/hydrogen-react';
import clsx from 'clsx';
import { type PropsWithChildren, useCallback, useMemo } from 'react';
import Icon from '@/components/icons/icon';
import { Button, type ButtonProps } from '@/features/shadcn/ui/button';

export const CartLine = ({
    asChild,
}: PropsWithChildren<{ asChild?: boolean }>) => {
    const Component = asChild ? Slot : 'li';
    const cart = useCart();
    const line = useCartLine();

    const title =
        line.merchandise?.title === 'Default Title'
            ? null
            : line.merchandise?.title;

    const handleQuantity = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const action = event.currentTarget.dataset.action;

            if (!line.id || line.quantity == null) return;

            if (action === 'decrement') {
                return void cart.linesUpdate([
                    { id: line.id, quantity: line.quantity - 1 },
                ]);
            }

            if (action === 'increment') {
                return void cart.linesUpdate([
                    { id: line.id, quantity: line.quantity + 1 },
                ]);
            }
        },
        [cart, line],
    );

    const sharedButtonProps = useMemo<ButtonProps>(
        () => ({
            variant: 'secondary',
            width: 'fixed',
            size: 'sm',
            className: 'rounded-full',
            disabled: cart.status === 'updating',
            onClick: handleQuantity,
        }),
        [handleQuantity, cart.status],
    );

    return (
        <Component className={clsx('flex py-6')}>
            <div className="size-24 shrink-0 overflow-hidden rounded-md border border-secondary">
                {line.merchandise?.image && (
                    <HydrogenImage
                        data={line.merchandise.image}
                        className="size-full object-cover"
                        sizes="(max-width: 768px) 20vw, 10vw"
                    />
                )}
            </div>

            <div className="ml-4 flex flex-1 flex-col gap-2">
                <div className="flex-1">
                    <h3>
                        <a href={line.merchandise?.product?.handle}>
                            {line.merchandise?.product?.title}
                        </a>
                    </h3>

                    {title && <p className="mt-1 text-sm text-body">{title}</p>}
                </div>

                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                    {!!line?.quantity && (
                        <div
                            className={clsx('flex items-center gap-3', {
                                '!opacity-50': cart.status === 'updating',
                            })}
                        >
                            <Button
                                {...sharedButtonProps}
                                data-action="decrement"
                            >
                                <Icon className="size-3" name="minus" />
                            </Button>

                            <p className="text-body">{line?.quantity}</p>

                            <Button
                                {...sharedButtonProps}
                                data-action="increment"
                            >
                                <Icon className="size-3" name="plus" />
                            </Button>
                        </div>
                    )}

                    <div className="flex text-base font-medium flex-1 justify-end">
                        {line.cost?.totalAmount && (
                            <Money data={line.cost.totalAmount} />
                        )}
                    </div>
                </div>
            </div>
        </Component>
    );
};
