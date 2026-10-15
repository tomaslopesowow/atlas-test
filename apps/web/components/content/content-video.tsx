'use client';

import { asDoc } from '@/features/payload/utils/as-doc';
import {
    getObjectFitClassName,
    getObjectPositionClassName,
} from '@/features/payload/utils/image-block-config';
import { cn } from '@/features/shadcn/utils/ui';
import type { MediaVideo } from '@/payload-types';
import { clsx } from 'clsx';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';
import { ImageCMS } from './content-image';

export type VideoCMSProps = Omit<
    React.VideoHTMLAttributes<HTMLVideoElement>,
    keyof MediaVideo | 'src'
> & {
    video?: MediaVideo | null;
    videoRef?: React.RefObject<HTMLVideoElement>;
    sizesAttribute?: string;
};

export function VideoCMS({
    video,
    videoRef,
    className,
    sizesAttribute,
    ...props
}: VideoCMSProps) {
    const {
        media,
        objectPosition,
        objectFit,
        muted,
        autoplay,
        loop,
        controls,
        playsInline,
        posterImage,
    } = video ?? {};

    const [isPlaying, setIsPlaying] = useState(!!autoplay);
    const [isMuted, setIsMuted] = useState(autoplay ? true : !!muted);
    const internalVideoRef = useRef<HTMLVideoElement>(null);

    const handlePlayPause = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!internalVideoRef.current) return;

        if (isPlaying) {
            internalVideoRef.current.pause();
        } else {
            internalVideoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleKeyPlayPause = (e: React.KeyboardEvent) => {
        e.preventDefault();
        if (!internalVideoRef.current) return;

        if (isPlaying) {
            internalVideoRef.current.pause();
        } else {
            internalVideoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleKeyPlayPause(e);
        }
    };

    if (!media) return;
    const { url } = asDoc(media) ?? {};

    if (!url) return;

    return (
        <div className={clsx('relative overflow-hidden', className)}>
            {autoplay && !controls && (
                <button
                    type="button"
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    className="absolute right-6 bottom-6 z-20 text-white transition appearance-none"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted((m) => !m);
                        const vid =
                            videoRef?.current || internalVideoRef.current;
                        if (vid) {
                            vid.muted = !isMuted;
                        }
                    }}
                    tabIndex={0}
                >
                    {isMuted ? (
                        <VolumeX className="w-8 h-8" />
                    ) : (
                        <Volume2 className="w-8 h-8" />
                    )}
                </button>
            )}

            <div
                // biome-ignore lint/a11y/useSemanticElements: default styles to <button> elements are be difficult to fully override
                role="button"
                tabIndex={0}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                className="relative w-full h-full cursor-pointer"
                onClick={handlePlayPause}
                onKeyDown={handleKeyDown}
            >
                <video
                    src={url}
                    ref={videoRef || internalVideoRef}
                    muted={autoplay ? true : isMuted}
                    loop={!!loop}
                    autoPlay={!!autoplay}
                    controls={!!controls}
                    playsInline={!!playsInline}
                    preload={autoplay ? 'none' : 'auto'}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-auto"
                    {...props}
                />

                <ImageCMS
                    image={posterImage}
                    sizes={sizesAttribute}
                    className={cn(
                        getObjectPositionClassName(objectPosition),
                        getObjectFitClassName(objectFit),
                        'absolute inset-0 w-full h-full transition-opacity duration-150',
                        isPlaying && 'opacity-0 pointer-events-none',
                    )}
                />

                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-text-gray12/20 cursor-pointer">
                        <Play className="w-12 md:w-16 h-12 md:h-16 text-white" />
                    </div>
                )}
            </div>
        </div>
    );
}
