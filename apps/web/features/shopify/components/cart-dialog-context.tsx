'use client';

import {
    type PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export interface CartDialogContextType {
    isOpen: boolean;
    show: () => void;
    hide: () => void;
    toggle: () => void;
}

export const CartDialogContext = createContext<CartDialogContextType | null>(
    null,
);

export const CartDialogProvider = ({ children }: PropsWithChildren) => {
    const [isOpen, setCartOpen] = useState(false);

    const value = useMemo(
        () => ({
            isOpen,
            show: () => setCartOpen(true),
            hide: () => setCartOpen(false),
            toggle: () => setCartOpen((state) => !state),
        }),
        [isOpen],
    );

    // Expose the cart dialog context to the window object in development mode,
    // for easier testing
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        Object.defineProperty(window, 'cartDialog', { value, writable: true });
    });

    return (
        <CartDialogContext.Provider value={value}>
            {children}
        </CartDialogContext.Provider>
    );
};

export const useCartDialog = () => {
    const context = useContext(CartDialogContext);

    if (!context) {
        throw new Error(
            'useCartDialog must be used within a CartDialogProvider',
        );
    }

    return context;
};
