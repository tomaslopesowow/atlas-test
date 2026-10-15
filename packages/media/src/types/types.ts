import type { ConversionSpec } from '../decorators/media.decorator.js';
import { MediaUploadInput } from '../dto/media-upload.input.js';
import type { MediaEntity } from '../entities/media.entity.js';

export enum ConversionStatus {
    Pending = 'PENDING',
    Processing = 'PROCESSING',
    Done = 'DONE',
    Failed = 'FAILED',
}

export interface ConversionState {
    fileName: string;
    /** Kept with the state, so any process can resume the conversion from the row alone. */
    spec: ConversionSpec;
    status: ConversionStatus;
    attempts: number;
    /** When the current attempt started, as an ISO string; how a stopped process's attempt is told apart. */
    startedAt?: string;
}

export type Conversions = Record<string, ConversionState>;

export interface StoreInput extends WithFile<MediaUploadInput> {
    conversions?: Conversions;
    attachments?: ModelRef[];
}

export interface RunInput {
    media: MediaEntity;
    /** The uploaded file, when still in memory; otherwise it is read from storage. */
    original?: Buffer;
}

export interface ConvertInput extends RunInput {
    name: string;
    state: ConversionState;
}

export interface AttemptInput extends RunInput {
    path: string;
    spec: ConversionSpec;
}

export interface SetStateInput {
    mediaId: string;
    name: string;
    from: ConversionState;
    to: ConversionState;
}

/** The model a media is attached to, e.g. `{ modelType: 'user', modelId: 5 }`. */
export interface ModelRef {
    modelType: string;
    modelId: number;
}

/** The largest id the integer modelId column holds; a larger one could only fail in a query. */
export const MAX_MODEL_ID = 2_147_483_647;

export interface FindForModelInput extends ModelRef {
    /** Only what was uploaded into this @Media() collection of the model. */
    collection?: string;
}

export interface MediaIdInput {
    id: string;
}

export interface KeepNewestInput extends ModelRef {
    collectionName: string;
}

export interface ReleaseInput extends ModelRef {
    mediaIds: string[];
}

/** What letting a model go of its media did. */
export interface ReleaseOutput {
    /** Media only the model had, deleted with their files. */
    deleted: number;
    /** Media other models still have, only detached from this one. */
    detached: number;
}

/** A service input together with its uploaded file. */
export type WithFile<T> = T & { file: Express.Multer.File };

/** The original's file name within its directory, which a conversion must not reuse. */
export const ORIGINAL_NAME = 'original';

/** Mime types whose extension is not simply their subtype. */
export const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
};
