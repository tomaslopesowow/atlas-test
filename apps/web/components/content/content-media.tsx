'use client';

import type { MediaField } from '@/payload-types';
import { ImageCMS, type ImageCMSProps } from './content-image';
import { VideoCMS, type VideoCMSProps } from './content-video';

/**
 * Base props for the MediaCMS component
 */
interface MediaCMSBaseProps {
    media?: MediaField | null;
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
    fadeIn = false,
    ...props
}: MediaCMSProps): JSX.Element | null => {
    if (!media) return null;

    const { type, image, video } = media;
    const { rounded, ...rest } = props;

    // Type narrowing for video content
    if (type === 'video' && video?.url) {
        return (
            <VideoCMS
                {...rest}
                className={props.className}
                video={video}
                sizesAttribute={sizes}
            />
        );
    }

    // Type narrowing for image content
    if (type === 'image' && image?.media) {
        return (
            <ImageCMS {...rest} image={image} sizes={sizes} fadeIn={fadeIn} />
        );
    }

    return null;
};
