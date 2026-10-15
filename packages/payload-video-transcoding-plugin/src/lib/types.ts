import type { CollectionSlug } from 'payload';

export type ACL =
    | 'authenticated-read'
    | 'aws-exec-read'
    | 'bucket-owner-full-control'
    | 'bucket-owner-read'
    | 'private'
    | 'public-read'
    | 'public-read-write';
export type ImageFormat = 'webp' | 'jpeg' | 'png';
export type VideoCodec = 'AV1' | 'H.264' | 'H.265' | 'vp9' | 'vp8';
export type VideoFormat = 'mp4' | 'webm';

export interface BaseVariant {
    key: string;
    width?: number;
    height?: number;
}

export interface VideoVariant extends BaseVariant {
    type: 'video';
    fps?: number;
    format?: VideoFormat;
    codec?: VideoCodec;
    keyframesIntervalSeconds?: number;
    customPixFormat?: string;
}

export interface ImageVariant extends BaseVariant {
    type: 'thumbnail';
    frame?: number;
    format?: ImageFormat;
}

export type Variant = VideoVariant | ImageVariant;

export interface TranscodeRequest {
    bucket: string;
    key: string;
    acl?: ACL;
    webhook?: string;
    variants: Variant[];
}

export interface TranscodeOutput {
    jobId: string;
    key: string;
}

export interface TranscodeResponse {
    id: string;
    outputs: TranscodeOutput[];
}

export type JobStatus = 'waiting' | 'failed' | 'completed' | 'processing';

export interface JobResponse {
    id: string;
    status: JobStatus;
    createdOn: Date;
    processedOn?: Date;
    finishedOn?: Date;
    progress?: number;
}

export interface ApiError {
    message: string[];
    error: string;
    statusCode: number;
}

export interface BaseCollectionVariant {
    width?: number;
    height?: number;
}

export interface VideoCollectionVariant extends BaseCollectionVariant {
    type: 'video';
    fps?: number;
    format: VideoFormat;
    codec?: VideoCodec;
    keyframesIntervalSeconds?: number;
    customPixFormat?: string;
}

export interface ImageCollectionVariant extends BaseCollectionVariant {
    type: 'thumbnail';
    frame?: number;
    format: ImageFormat;
}

export type CollectionVariant = VideoCollectionVariant | ImageCollectionVariant;

export type SizeKey = string;

export interface CollectionConfig {
    mimeTypes: (string | RegExp)[];
    bucket: string;
    acl?: ACL;
    variants: Record<SizeKey, CollectionVariant>;
    webhook?: boolean;
}

export type PayloadVideoTranscodingPluginConfig = {
    // default: true
    enabled?: boolean;
    collections: Partial<Record<CollectionSlug, CollectionConfig>>;
    apiClientId: string;
    apiClientSecret: string;
    apiEndpoint: string;
    cdn: string;
};
