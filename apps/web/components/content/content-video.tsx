import type { Media } from '@/payload-types';
import type { ComponentProps } from 'react';
import type { PlayButtonProps } from '../common/play-button';
import { VideoCMSClient } from './content-video.client';

const DEFAULT_SHARED_PROPS: Partial<VideoCMSProps> = {
    playsInline: true,
};

const DEFAULT_SERVER_PROPS: Partial<VideoCMSProps> = {
    autoPlay: true,
    muted: true,
    loop: true,
};

export type VideoCMSProps = ComponentProps<'video'> & {
    video: Media;
    customControls?: PlayButtonProps;
};

export function VideoCMS({
    video: { url },
    customControls,
    ...props
}: VideoCMSProps) {
    if (!url) return null;

    if (!customControls) {
        const serverVideoProps = {
            ...DEFAULT_SHARED_PROPS,
            ...DEFAULT_SERVER_PROPS,
            ...props,
        };

        return <video src={`${url}#t=0.0001`} {...serverVideoProps} />;
    }

    const clientVideoProps = {
        ...DEFAULT_SHARED_PROPS,
        ...props,
        customControls,
    };

    return <VideoCMSClient url={url} {...clientVideoProps} />;
}
