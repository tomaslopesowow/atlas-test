'use client';

import { Slot } from '@radix-ui/react-slot';
import { clientGuard } from '@repo/lib/environment';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { MediaCMS } from '@/components/content/content-media';
import type { MediaField } from '@/payload-types';
import type { Maybe } from '@/utils/maybe';
import { useMotion } from '../hooks/use-motion';
import { createPhysicsBasedMotion } from '../utils/second-order-dynamics';
import { usePathname } from 'next/navigation';
import { cn } from '@/features/shadcn/utils/ui';

const ROUNDING_THRESHOLD = 0.001;
const SCALE_INTENSITY_FACTOR = 0.1;
const MIN_REVEAL_PROGRESS = 0.5;

const READY_STATE_EVENTS = [
    'loadeddata',
    'canplay',
    'canplaythrough',
    'loadedmetadata',
];

type ClippedMediaConfig = {
    start?: ScrollTrigger['vars']['start'];
    end?: ScrollTrigger['vars']['end'];
};

const DEFAULT_CONFIG: Required<ClippedMediaConfig> = {
    start: 'top bottom',
    end: 'top+=50% bottom',
};

interface ClippedMediaProps extends ComponentProps<'div'> {
    media: Maybe<MediaField>;
    config?: ClippedMediaConfig;
    mediaProps?: ComponentProps<typeof MediaCMS>;
}

export const ClippedMedia = ({
    media,
    config,
    className,
    mediaProps,
    ...props
}: ClippedMediaProps) => {
    const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...config,
    };
    const { start, end } = mergedConfig;

    const scrollPhysics = createPhysicsBasedMotion(0.8, 0.8, -0.2, 0);
    const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    let progress = 0;

    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const pathName = usePathname();

    useEffect(() => {
        if (media?.type !== 'video') return;

        const videoElement = mediaRef.current as HTMLVideoElement | null;
        if (!videoElement) return;

        const checkReadyState = () => {
            if (videoElement.readyState >= 3) {
                setIsMediaLoaded(true);
            }
        };

        checkReadyState();

        READY_STATE_EVENTS.forEach((event) => {
            videoElement.addEventListener(event, checkReadyState);
        });

        return () => {
            READY_STATE_EVENTS.forEach((event) => {
                videoElement.removeEventListener(event, checkReadyState);
            });
        };
    }, [media?.type]);

    const tick = (delta: number, gsap: GSAP) => {
        if (!mediaRef.current || !containerRef.current) return;

        let easedProgress = scrollPhysics.update(delta / 1000, progress);

        if (easedProgress >= 1 - ROUNDING_THRESHOLD) {
            easedProgress = 1;
        }
        if (easedProgress <= ROUNDING_THRESHOLD) {
            easedProgress = 0;
        }
        const clipPercent = 50 - easedProgress * 50;
        const scaleAmount = 1 - (1 - easedProgress) * SCALE_INTENSITY_FACTOR;

        gsap.set(containerRef.current, {
            clipPath: `inset(0% ${clipPercent}% ${clipPercent}% ${clipPercent}%)`,
        });
        gsap.set(mediaRef.current, {
            scale: scaleAmount,
        });
    };

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            if (!isMediaLoaded) return;

            gsap.registerPlugin(ScrollTrigger);
            const context = gsap.context(() => {
                ScrollTrigger.create({
                    trigger: containerRef.current,
                    start,
                    end,
                    scrub: true,
                    onEnter: (self) => {
                        progress =
                            MIN_REVEAL_PROGRESS +
                            self.progress * (1 - MIN_REVEAL_PROGRESS);
                    },
                    onUpdate: (self) => {
                        progress =
                            MIN_REVEAL_PROGRESS +
                            self.progress * (1 - MIN_REVEAL_PROGRESS);
                    },
                });
                gsap.ticker.add((_, delta) => tick(delta, gsap));
            });

            return () => {
                context.kill();
                gsap.ticker.remove(tick);
            };
        },
        {
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
            load: {
                when: 'visible',
                ref: containerRef,
                options: {
                    rootMargin: `${clientGuard(() => window.innerHeight)}px`,
                },
            },
        },
        [isMediaLoaded, pathName],
    );

    return (
        <div
            {...props}
            className={cn('w-full aspect-video overflow-hidden', className)}
            ref={containerRef}
            style={{ clipPath: 'inset(0% 50% 50% 50%)' }}
        >
            <Slot ref={mediaRef}>
                <MediaCMS
                    {...mediaProps}
                    media={media}
                    className="w-full h-full origin-top"
                    onLoad={() =>
                        media?.type === 'image' && setIsMediaLoaded(true)
                    }
                />
            </Slot>
        </div>
    );
};
