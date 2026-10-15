'use client';

import { Play, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';
import {
    getObjectFitClassName,
    getObjectPositionClassName,
} from '@/features/payload/utils/image-block-config';
import type { MediaVideo } from '@/payload-types';
import { cn } from '@/utils/cn';
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
    if (!video?.url) return;

    const {
        url,
        objectPosition,
        objectFit,
        muted,
        autoplay,
        loop,
        controls,
        playsInline,
        posterImage,
    } = video;

    // biome-ignore lint/correctness/useHookAtTopLevel: media url is static
    const [isPlaying, setIsPlaying] = useState(!!autoplay);
    // biome-ignore lint/correctness/useHookAtTopLevel: media url is static
    const [isMuted, setIsMuted] = useState(autoplay ? true : !!muted);
    // biome-ignore lint/correctness/useHookAtTopLevel: media url is static
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

    return (
        <div className={cn('relative overflow-hidden', className)}>
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

            {/* biome-ignore lint/a11y/useSemanticElements: default styles to <button> elements are be difficult to fully override */}
            <div
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
