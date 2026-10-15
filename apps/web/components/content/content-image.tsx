'use client';

import {
    getObjectFitClassName,
    getObjectPositionClassName,
} from '@/features/payload/utils/image-block-config';
import type { Media, MediaImage } from '@/payload-types';
import { clsx } from 'clsx';
import NextImage, { type ImageLoader, type ImageProps } from 'next/image';
import { useCallback } from 'react';

export type ImageCMSProps = Partial<ImageProps> & {
    image?: MediaImage | null;
};

const isSvg = (filename?: string | null) =>
    filename && /\.svg$/i.test(filename);

export function ImageCMS({ image, className, ...props }: ImageCMSProps) {
    if (!image) return null;

    const media = image.media as Media | undefined;
    if (!media) return null;

    const { imagePreload, objectFit, objectPosition } = image;
    const { url, description, width, height, sizes } = media;

    if (!url) return null;

    const imageLoader = useCallback<ImageLoader>(
        ({ src, width }) => {
            if (width <= 400 && sizes?.w400?.url) return sizes.w400.url;
            if (width <= 640 && sizes?.w640?.url) return sizes.w640.url;
            if (width <= 750 && sizes?.w750?.url) return sizes.w750.url;
            if (width <= 828 && sizes?.w828?.url) return sizes.w828.url;
            if (width <= 1080 && sizes?.w1080?.url) return sizes.w1080.url;
            if (width <= 1200 && sizes?.w1200?.url) return sizes.w1200.url;
            if (width <= 1920 && sizes?.w1920?.url) return sizes.w1920.url;
            if (width <= 2048 && sizes?.w2048?.url) return sizes.w2048.url;
            return sizes?.w3840?.url ?? src;
        },
        [sizes],
    );

    return (
        <NextImage
            alt={description ?? ''}
            src={url}
            {...(isSvg(media?.filename)
                ? { unoptimized: true }
                : { loader: imageLoader })}
            width={props.fill ? undefined : (width ?? undefined)}
            height={props.fill ? undefined : (height ?? undefined)}
            priority={!!imagePreload}
            {...props}
            className={clsx(
                getObjectPositionClassName(objectPosition),
                getObjectFitClassName(objectFit),
                className,
            )}
        />
    );
}
