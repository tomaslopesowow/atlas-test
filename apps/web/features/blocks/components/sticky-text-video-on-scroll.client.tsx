'use client';

import { useRef } from 'react';
import Heading from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import type { StickyTextVideoOnScroll } from '@/payload-types';
import { VideoOnScroll } from '../../animation/components/video-on-scroll';
import { useMotion } from '../../animation/hooks/use-motion';
import { cn } from '../../shadcn/utils/ui';

export const StickyTextVideoOnScrollClient = ({
    content1,
    content2,
    videoOnScroll,
}: StickyTextVideoOnScroll) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            const context = gsap.context(() => {
                if (!containerRef.current) return;
                if (!innerRef.current) return;
                gsap.registerPlugin(ScrollTrigger);

                const pinLengthPx =
                    ((videoOnScroll?.pinLength ?? 100) / 100) *
                    window.innerHeight;

                const innerWidth = innerRef.current.clientWidth;
                const targetX = innerWidth / 3;

                const translateAnimation = gsap.to(innerRef.current, {
                    x: `-${targetX}px`,
                    duration: 1,
                    ease: 'power2.inOut',
                });

                ScrollTrigger.create({
                    trigger: containerRef.current,
                    start: 'top top',
                    end: `bottom+=${pinLengthPx}px bottom`,
                    scrub: true,
                    pin: true,
                    animation: translateAnimation,
                });
            });
            return () => {
                context.revert();
            };
        },
        {
            load: {
                when: 'load',
            },
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
            observeWindowResize: () => true,
            mediaQueryList: () => matchMedia('(min-width: 768px)'),
        },
        [],
    );

    return (
        <section ref={containerRef}>
            <div className="relative md:h-svh w-full md:overflow-x-clip">
                <div
                    className="w-full md:w-[150%] h-full grid grid-cols-1 md:grid-cols-3 md:absolute left-0 gap-y-16"
                    ref={innerRef}
                >
                    <Content content={content1} />
                    <div className="h-[calc(100vh-5rem)] md:h-svh">
                        <VideoOnScroll
                            {...videoOnScroll}
                            pin={false}
                            style={{ height: '100%' }}
                            className="size-full"
                        />
                    </div>
                    <Content content={content2} />
                </div>
            </div>
        </section>
    );
};

interface ContentProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
    content?: StickyTextVideoOnScroll['content1'];
}

const Content = ({ content, className, ...props }: ContentProps) => (
    <div
        {...props}
        className={cn('flex flex-col items-center justify-center', className)}
    >
        <div className="grid grid-cols-6 text-center gap-y-8 md:gap-y-16 px-4 md:px-0">
            {content?.title && (
                <Heading
                    variant="heading-4"
                    className="col-span-6 md:col-span-4 md:col-start-2"
                >
                    {content.title}
                </Heading>
            )}
            {content?.simpleRichText && (
                <p className="col-span-6 md:col-span-4 md:col-start-2">
                    {renderLexicalSimple(content.simpleRichText)}
                </p>
            )}
        </div>
    </div>
);
