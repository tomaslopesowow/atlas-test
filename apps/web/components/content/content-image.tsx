'use client';

import { clsx } from 'clsx';
import NextImage, { type ImageLoader, type ImageProps } from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import {
    getObjectFitClassName,
    getObjectPositionClassName,
} from '@/features/payload/utils/image-block-config';
import type { Media, MediaImage } from '@/payload-types';

export type ImageCMSProps = Partial<ImageProps> & {
    image?: MediaImage | null;
    fadeIn?: boolean;
};

const isSvg = (filename?: string | null) =>
    filename && /\.svg$/i.test(filename);

const FADE_IN_THRESHOLD = 0.4;

export function ImageCMS({
    image,
    className,
    fadeIn = false,
    ...props
}: ImageCMSProps) {
    const media = image?.media as Media | undefined;
    const { imagePreload, objectFit, objectPosition } = image ?? {};
    const { url, description, width, height, sizes } = media ?? {};

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

    const observerRef = useRef<IntersectionObserver | null>(null);

    const initializeObserver = useCallback((target: HTMLImageElement) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        target.style.opacity = '1';
                    }
                });
            },
            {
                threshold: FADE_IN_THRESHOLD,
            },
        );

        observer.observe(target);
        observerRef.current = observer;
    }, []);

    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    if (!image || !media || !url) return null;

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
            style={{
                ...props.style,
                ...(fadeIn && {
                    opacity: 0,
                    transition: 'opacity 1s ease-in-out',
                }),
            }}
            onLoad={(event) => {
                props.onLoad?.(event);
                if (fadeIn) {
                    initializeObserver(event.target as HTMLImageElement);
                }
            }}
        />
    );
}
