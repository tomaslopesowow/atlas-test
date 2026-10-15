'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to track window visibility state.
 * Returns true when the window/tab is visible, false when hidden.
 *
 * @example
 * ```tsx
 * const isVisible = useWindowVisibility();
 *
 * useEffect(() => {
 *   if (isVisible) {
 *     // Resume animations or audio
 *   } else {
 *     // Pause animations or audio
 *   }
 * }, [isVisible]);
 * ```
 */
export const useWindowVisibility = (): boolean => {
    const [isVisible, setIsVisible] = useState(
        typeof window !== 'undefined'
            ? document.visibilityState === 'visible'
            : true,
    );

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState === 'visible');
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, []);

    return isVisible;
};
