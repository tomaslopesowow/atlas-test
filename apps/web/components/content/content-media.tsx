import { cn } from '@/features/shadcn/utils/ui';
import type { MediaField } from '@/payload-types';
import { ImageCMS, type ImageCMSProps } from './content-image';
import { VideoCMS, type VideoCMSProps } from './content-video';

/**
 * Base props for the MediaCMS component
 */
interface MediaCMSBaseProps {
    media?: MediaField;
    sizes?: string;
    rounded?: boolean;
}

/**
 * Combined props for the MediaCMS component
 * Uses type for combining potentially conflicting prop types
 */
type MediaCMSProps = MediaCMSBaseProps &
    Partial<Omit<VideoCMSProps, 'video'>> &
    Partial<Omit<ImageCMSProps, 'image'>>;

/**
 * MediaCMS component renders the appropriate media component based on media type
 */
export const MediaCMS = ({
    media,
    sizes = '100vw',
    rounded = true,
    ...props
}: MediaCMSProps): JSX.Element | null => {
    if (!media) return null;

    const { type, image, video } = media;

    // Type narrowing for video content
    if (type === 'video' && video?.url) {
        return (
            <VideoCMS
                {...props}
                className={cn(props.className, rounded && 'rounded-md')}
                video={video}
            />
        );
    }

    // Type narrowing for image content
    if (type === 'image' && image?.media) {
        return (
            <ImageCMS
                {...props}
                image={image}
                className={cn(props.className, rounded && 'rounded-md')}
                sizes={sizes}
            />
        );
    }

    return null;
};
