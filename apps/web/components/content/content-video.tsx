import { asDoc } from '@/features/payload/utils/as-doc';
import type { MediaVideo } from '@/payload-types';
import { clsx } from 'clsx';

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

    const { url, muted, autoplay, loop, controls, playsInline, posterImage } =
        video;

    const posterUrl = asDoc(posterImage?.media)?.sizes?.w1080?.url;

    return (
        <div className={clsx('relative overflow-hidden', className)}>
            <video
                src={url}
                ref={videoRef}
                muted={autoplay ? true : !!muted}
                loop={!!loop}
                autoPlay={!!autoplay}
                controls={!!controls}
                playsInline={playsInline ?? true}
                preload={autoplay ? 'none' : 'auto'}
                poster={posterUrl ?? undefined}
                className="w-full h-auto"
                {...props}
            />
        </div>
    );
}
