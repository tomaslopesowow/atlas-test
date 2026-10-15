'use client';

import type { MediaVideo } from '@/payload-types';
import { clientGuard } from '@repo/lib/environment';
import { useRef } from 'react';

export const VideoOnScroll = ({ video }: { video: MediaVideo }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleScroll = () => {
        if (!videoRef.current) return;

        const videoDuration = videoRef.current.duration;
        const { y } = videoRef.current.getBoundingClientRect();
        const progress = (window.innerHeight - y) / window.innerHeight;

        videoRef.current.currentTime = progress * videoDuration;
    };

    clientGuard(() => {
        window.addEventListener('scroll', handleScroll);
    });

    return (
        <video
            ref={videoRef}
            src={video.url}
            preload="auto"
            muted
            playsInline
        />
    );
};
