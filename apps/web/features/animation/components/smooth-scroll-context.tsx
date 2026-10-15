'use client';

import Lenis from 'lenis';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    type PropsWithChildren,
} from 'react';
import { useMotion } from '../hooks/use-motion';

type SmoothScrollContextValue = {
    setInfinite: (enabled: boolean) => void;
    setLocked: (locked: boolean) => void;
    scrollTo: (target: number, immediate?: boolean) => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(
    null,
);

let pendingInfinite: boolean | null = null;

export const SmoothScrollProvider = ({ children }: PropsWithChildren) => {
    const lenisRef = useRef<Lenis | null>(null);

    const setLocked = useCallback((locked: boolean) => {
        const lenis = lenisRef.current;
        if (!lenis) return;

        if (locked) {
            lenis.stop();
        } else {
            lenis.start();
        }
    }, []);

    const setInfinite = useCallback((enabled: boolean) => {
        const lenis = lenisRef.current;
        if (lenis) {
            lenis.options.infinite = enabled;
            lenis.options.syncTouch = enabled;
            lenis.scrollTo(0, { immediate: true });
        } else {
            pendingInfinite = enabled;
        }
    }, []);

    const scrollTo = useCallback(
        (target: number, immediate: boolean = false) => {
            const lenis = lenisRef.current;
            if (!lenis) return;

            lenis.scrollTo(target, { immediate, force: true });
        },
        [],
    );

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            const lenis = new Lenis();
            lenisRef.current = lenis;
            setLocked(false);

            if (pendingInfinite !== null) {
                lenis.options.infinite = pendingInfinite;
                lenis.options.syncTouch = pendingInfinite;
                pendingInfinite = null;
            }
            const lenisTimeMs = lenis.time;
            const gsapTimeMs = gsap.ticker.time * 1000;
            const timeDiffMs = lenisTimeMs - gsapTimeMs;

            const update = (time: number) =>
                lenis.raf(time * 1000 + timeDiffMs);

            gsap.ticker.add(update);
            gsap.ticker.lagSmoothing(0);

            gsap.registerPlugin(ScrollTrigger);
            lenis.on('scroll', ScrollTrigger.update);

            return () => {
                gsap.ticker.remove(update);
                lenis.destroy();
                lenisRef.current = null;
            };
        },
        {
            enable: process.env.NEXT_PUBLIC_ECOMMERCE !== 'yes',
            load: { when: 'load' },
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
        },
    );
    const value = useMemo(
        () => ({ setInfinite, setLocked, scrollTo }),
        [setInfinite, setLocked, scrollTo],
    );

    return (
        <SmoothScrollContext.Provider value={value}>
            {children}
        </SmoothScrollContext.Provider>
    );
};

export const useSmoothScroll = () => {
    const context = useContext(SmoothScrollContext);
    if (!context) {
        throw new Error(
            'useSmoothScroll must be used within a SmoothScrollProvider',
        );
    }
    return context;
};
