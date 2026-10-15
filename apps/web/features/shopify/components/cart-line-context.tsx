import { useCart } from '@shopify/hydrogen-react';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { createContext, type PropsWithChildren, use, useMemo } from 'react';

export const CartLineContext = createContext<CartLine | null>(null);

export const CartLineProvider = ({
    children,
    lineId,
}: PropsWithChildren<{ lineId: string }>) => {
    const cart = useCart();

    const line = useMemo(
        () =>
            (cart.lines?.find((line) => line?.id === lineId) ??
                null) as CartLine | null,
        [lineId, cart.lines],
    );

    return (
        <CartLineContext.Provider value={line}>
            {children}
        </CartLineContext.Provider>
    );
};

export const useCartLine = () => use(CartLineContext);
