'use client';

import { asDoc } from '@/features/payload/utils/as-doc';
import {
    getObjectFitClassName,
    getObjectPositionClassName,
} from '@/features/payload/utils/image-block-config';
import { cn } from '@/features/shadcn/utils/ui';
import type { MediaVideo } from '@/payload-types';

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
        url,
        muted,
        autoplay,
        loop,
        controls,
        posterImage,
        objectFit,
        objectPosition,
    } = video ?? {};

    if (!url) return null;

    return (
        <video
            src={url}
            ref={videoRef}
            muted={autoplay ? true : !!muted}
            loop={!!loop}
            autoPlay={!!autoplay}
            controls={!!controls}
            playsInline={true}
            preload={autoplay ? 'none' : 'auto'}
            poster={asDoc(posterImage?.media)?.sizes?.w1920?.url ?? undefined}
            className={cn(
                'w-full h-auto',
                getObjectFitClassName(objectFit),
                getObjectPositionClassName(objectPosition),
                className,
            )}
            {...props}
        />
    );
}
