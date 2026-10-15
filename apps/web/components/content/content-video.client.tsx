'use client';

import { cn } from '@/features/shadcn/utils/ui';
import { type ComponentProps, type RefObject, useRef, useState } from 'react';
import { PlayButton, type PlayButtonProps } from '../common/play-button';

interface VideoCMSClientProps extends ComponentProps<'video'> {
    url: string;
    customControls: PlayButtonProps;
    videoRef?: RefObject<HTMLVideoElement | null>;
}

export const VideoCMSClient = ({
    url,
    customControls,
    videoRef,
    ...props
}: VideoCMSClientProps) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    const ref = videoRef ?? internalRef;
    const [playing, setPlaying] = useState(false);

    return (
        <div className="relative size-fit">
            <video
                src={`${url}#t=0.0001`}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                {...props}
                ref={ref}
            />
            <button
                type="button"
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() =>
                    playing ? ref.current?.pause() : ref.current?.play()
                }
            >
                <PlayButton
                    variant={customControls.variant}
                    size={customControls.size}
                    className={cn('transition-opacity', playing && 'opacity-0')}
                />
            </button>
        </div>
    );
};
