import type { Metadata } from 'next';
import type { Page } from '@/payload-types';

export const createMetadataFromSeoMeta = (
    meta?: Page['meta'] | null,
): Metadata => {
    if (!meta) return {};

    const { title, description } = meta;
    const image = typeof meta.image === 'string' ? null : meta.image;

    return {
        title,
        description,
        openGraph: image?.url
            ? {
                  images: [
                      {
                          url: image.url,
                          width: image.width ?? undefined,
                          height: image.height ?? undefined,
                          alt: image.description ?? undefined,
                      },
                  ],
              }
            : undefined,
    };
};
