'use client';

import { useEffect, useState } from 'react';

export const useWindowSize = (enabled = true, debounceMs = 0) => {
    const [state, setState] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!enabled) return;

        let timer: ReturnType<typeof setTimeout>;

        const handleWindowResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setState({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, debounceMs);
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [enabled, debounceMs]);

    return state;
};
