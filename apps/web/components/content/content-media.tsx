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
    ...props
}: MediaCMSProps): JSX.Element | null => {
    if (!media) return null;

    const { type, image, video } = media;

    // Type narrowing for video content
    if (type === 'video' && video?.url) {
        return <VideoCMS {...props} video={video} sizesAttribute={sizes} />;
    }

    // Type narrowing for image content
    if (type === 'image' && image?.media) {
        return (
            <ImageCMS
                {...props}
                image={image}
                className={cn(props.className, 'rounded-md')}
                sizes={sizes}
            />
        );
    }

    return null;
};
