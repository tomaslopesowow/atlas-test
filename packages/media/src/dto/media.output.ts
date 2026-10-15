import { MediaEntity } from '../entities/media.entity.js';
import type { ConversionState } from '../types/types.js';
import type { MediaUrlsOutput } from './media-urls.output.js';

/** A conversion as clients see it: the spec and the lease are the worker's business. */
export type ConversionOutput = Pick<
    ConversionState,
    'fileName' | 'status' | 'attempts'
>;

export class MediaOutput {
    id!: string;
    name!: string;
    fileName!: string;
    mimeType!: string;
    size!: number;
    conversions!: Record<string, ConversionOutput>;
    urls!: MediaUrlsOutput;
    createdAt!: Date;
    updatedAt!: Date;
}

export function toMediaOutput(
    media: MediaEntity,
    urls: MediaUrlsOutput,
): MediaOutput {
    return {
        id: media.id,
        name: media.name,
        fileName: media.fileName,
        mimeType: media.mimeType,
        size: media.size,
        conversions: Object.fromEntries(
            Object.entries(media.conversions).map(
                ([name, { fileName, status, attempts }]) => [
                    name,
                    { fileName, status, attempts },
                ],
            ),
        ),
        urls,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
    };
}
