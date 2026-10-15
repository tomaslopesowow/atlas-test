'use client';

import type { PropsWithChildren } from 'react';
import { useMotion } from '../../animation/hooks/use-motion';

export function ArticleHeaderClient({ children }: PropsWithChildren) {
    useMotion(
        ([{ default: gsap }]) => {
            const context = gsap.context(() => {
                const startOffsetTop =
                    document
                        .querySelector('#article-header')
                        ?.getBoundingClientRect().top ?? 0;

                const scrollTrigger: ScrollTrigger.Vars = {
                    trigger: '#article-header',
                    endTrigger: '#article-header-motion',
                    scrub: true,
                    start: `top top+=${startOffsetTop}`,
                    end: 'top top',
                };

                gsap.to(
                    '#article-header-motion footer, #article-header-motion .cover-image',
                    {
                        width: '100%',
                        ease: 'none',
                        scrollTrigger,
                    },
                );

                gsap.to('#article-header-motion .cover-image img', {
                    scale: 1,
                    ease: 'none',
                    scrollTrigger,
                });
            });

            return () => {
                context.revert();
                context.kill();
            };
        },
        {
            mediaQueryList() {
                return window.matchMedia('(min-width: 1024px)');
            },
            loader: () => [import('gsap')] as const,
            load: { when: 'load' },
            observeWindowResize: true,
        },
    );

    return <>{children}</>;
}
