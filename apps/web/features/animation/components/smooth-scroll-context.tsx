'use client';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis, { type LenisOptions } from 'lenis';
import {
    createContext,
    type PropsWithChildren,
    useContext,
    useMemo,
    useState,
} from 'react';
import { useMotion } from '../hooks/use-motion';

type SmoothScrollContextValue = {
    lenis: Lenis | null;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(
    null,
);

const LENIS_CONFIG: LenisOptions = {
    syncTouch: true,
    syncTouchLerp: 0.025,
    touchMultiplier: 0.6,
    touchInertiaExponent: 2.5,
};

export const SmoothScrollProvider = ({ children }: PropsWithChildren) => {
    const [lenis, setLenis] = useState<Lenis | null>(null);

    useMotion(() => {
        if (process.env.NEXT_PUBLIC_ECOMMERCE === 'yes') return;

        const lenisInstance = new Lenis(LENIS_CONFIG);
        setLenis(lenisInstance);
        const update = (time: number) => lenisInstance.raf(time * 1000);

        gsap.ticker.add(update);
        gsap.ticker.lagSmoothing(0);

        gsap.registerPlugin(ScrollTrigger);
        lenisInstance.on('scroll', ScrollTrigger.update);

        return () => {
            gsap.ticker.remove(update);
            lenisInstance.destroy();
            setLenis(null);
        };
    });
    const value = useMemo(() => ({ lenis }), [lenis]);

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
