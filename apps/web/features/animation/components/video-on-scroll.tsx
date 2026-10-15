'use client';
import { ImageCMS } from '@/components/content/content-image';
import { cn } from '@/components/utils/ui';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { MediaImage, ScrollVideo } from '@/payload-types';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { useMedia } from 'react-use';
import { useMotion } from '../hooks/use-motion';

type VideoOnScrollProps = {
    video?: string | ScrollVideo | null;
    fallbackImage?: MediaImage;
    className?: string;
    scrollLength?: number | null;
    pin?: boolean | null;
    pinLength?: number | null;
    sizes?: string;
    observerRootMargin?: number;
    startOffset?: number | null;
};

/**
 * VideoOnScroll component that decodes and draws frames from a video on scroll.
 *
 * @description
 * The VideoOnScroll component is a component that decodes and draws frames from a video on scroll.
 *
 * @param props.className - Additional classnames for the canvas element.
 * @param props.scrollLength - The total length the user has to scroll to play the whole video, in view height.
 * @param props.pin - Whether the video should be pinned to the top of the screen. Surrounding section will act as a pin spacer.
 * @param props.pinLength - The length of the pin spacer.
 * @param props.observerRootMargin - The root margin for the intersection observer.
 * @param props.startOffset - The offset in vh from the top of the screen at which the video will start playing.
 *
 */

export const VideoOnScroll = ({
    video,
    className,
    scrollLength = 100, // vh
    sizes = '100vw',
    pin = false,
    pinLength = 200, // vh
    observerRootMargin = 600, // px
    startOffset = 0,
}: VideoOnScrollProps) => {
    const { fallbackImage, videoVariants } = asDoc(video) ?? {};
    const { vp9, vp9Mobile } = videoVariants ?? {};

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerOffset = useRef(0);
    const workerRef = useRef<Worker | null>(null);
    const pathName = usePathname();
    const isMobile = useMedia('(max-width: 1023px)', false);

    const dataUriDesktop = vp9?.url;
    const dataUriMobile = vp9Mobile?.url;
    const dataUri = isMobile
        ? (dataUriMobile ?? dataUriDesktop)
        : dataUriDesktop;

    useMotion(
        () => {
            if (!dataUri && !fallbackImage) return;

            if (!workerRef.current) {
                workerRef.current = new Worker(
                    new URL(
                        '../../../src/workers/video-decoder/worker.js',
                        import.meta.url,
                    ),
                    {
                        type: 'module',
                    },
                );
            }

            const length =
                ((scrollLength ?? 100 + 100) / 100) * window.innerHeight -
                window.innerHeight;

            let busy = false;
            const handleScroll = () => {
                if (busy) return;

                workerRef.current?.postMessage({
                    type: 'scroll',
                    y:
                        window.scrollY -
                        containerOffset.current -
                        (window.innerHeight / 100) * (startOffset ?? 0),
                    length,
                    width: canvasRef.current?.clientWidth,
                    height: canvasRef.current?.clientHeight,
                });
            };

            const handleMessage = ({ data: { type } }: MessageEvent) => {
                switch (type) {
                    case 'busy':
                        busy = true;
                        break;
                    case 'idle':
                        busy = false;
                        break;
                    case 'ready':
                        {
                            const canvas =
                                canvasRef.current?.transferControlToOffscreen();
                            if (!canvas) return;

                            workerRef.current?.postMessage(
                                {
                                    type: 'start',
                                    dataUri,
                                    canvas,
                                    width: canvasRef.current?.clientWidth,
                                    height: canvasRef.current?.clientHeight,
                                },
                                [canvas],
                            );
                        }

                        break;
                    case 'demuxingComplete':
                        {
                            const { top } =
                                containerRef.current?.getBoundingClientRect() ?? {
                                    top: 0,
                                };

                            const isContainerAboveFold =
                                top + window.scrollY < window.innerHeight;

                            const containerBelowFoldOffset =
                                (containerRef.current?.getBoundingClientRect()
                                    .top ?? 0) +
                                window.scrollY -
                                window.innerHeight;

                            containerOffset.current = !isContainerAboveFold
                                ? containerBelowFoldOffset
                                : 0;

                            if (canvasRef.current)
                                canvasRef.current.dataset.active = 'true';

                            window.addEventListener('scroll', handleScroll);
                        }
                        break;
                }
            };

            workerRef.current?.addEventListener('message', handleMessage);

            return () => {
                workerRef.current?.terminate();
            };
        },
        {
            load: {
                when: 'visible',
                ref: containerRef,
                options: {
                    rootMargin: `${observerRootMargin}px`,
                },
            },
            // load a dummy loader
            loader: () => [Promise.resolve({ default: true })],
        },
        [isMobile, pathName],
    );

    if (!dataUri && !fallbackImage) return;

    return (
        <div
            ref={containerRef}
            style={{ height: pin ? `${pinLength}lvh` : 'auto' }}
            className="min-h-screen"
        >
            <div
                className={cn(
                    'relative w-full',
                    pin && 'sticky top-0',
                    className,
                )}
            >
                <ImageCMS
                    image={fallbackImage}
                    sizes={sizes}
                    className="absolute top-0 size-full object-cover"
                />

                {dataUri && (
                    <canvas
                        ref={canvasRef}
                        className="data-[active=true]:opacity-100 opacity-0 !transition-opacity !duration-700 size-full z-10 relative"
                    />
                )}
            </div>
        </div>
    );
};
