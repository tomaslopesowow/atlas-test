'use client';

import { useCart } from '@shopify/hydrogen-react';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect } from 'react';
import { useCookie } from 'react-use';

export const CartUtilsContext = createContext({});

export const CartUtilsProvider = ({ children }: PropsWithChildren) => {
    const cart = useCart();
    const [, setCartIdCookie] = useCookie('shopifyCartId');

    // Expose the cart context to the window object in development mode,
    // for easier testing
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        Object.defineProperty(window, 'cart', { value: cart, writable: true });
    });

    // create cart if not exists
    // biome-ignore lint/correctness/useExhaustiveDependencies: don't need extra deps
    useEffect(() => {
        if (cart.id || !cart.cartReady) return;

        cart.cartCreate({
            // biome-ignore lint/suspicious/noExplicitAny: some nested optional type is incorrectly typed
            buyerIdentity: cart.buyerIdentity as any,
        });
    }, [cart.id, cart.cartReady]);

    // save cart id to cookie for server side usage
    // biome-ignore lint/correctness/useExhaustiveDependencies: don't need extra deps
    useEffect(() => {
        if (!cart.id) return;
        setCartIdCookie(cart.id, { expires: 10 });
    }, [cart.id]);

    return (
        <CartUtilsContext.Provider value={{}}>
            {children}
        </CartUtilsContext.Provider>
    );
};

export const useCartUtils = () => {
    const context = useContext(CartUtilsContext);

    if (!context) {
        throw new Error('useCartUtils must be used within a CartUtilsProvider');
    }

    return context;
};
