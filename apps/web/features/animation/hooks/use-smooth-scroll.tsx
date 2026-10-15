'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useMotion } from './use-motion';

export const useSmoothScroll = () => {
    const pathname = usePathname();

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            const lenis = new Lenis();
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
            };
        },
        {
            // disable smooth scroll on e-commerce apps
            enable: process.env.NEXT_PUBLIC_ECOMMERCE !== 'yes',
            load: { when: 'load' },
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
        },
        [pathname],
    );
};
