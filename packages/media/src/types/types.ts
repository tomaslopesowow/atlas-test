import type { ConversionSpec } from '../decorators/media.decorator.js';

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

/** The model a media is attached to, by its entity's table name: `@Entity('user')` → `{ modelType: 'user', modelId: 5 }`. */
export interface ModelRef {
    modelType: string;
    modelId: number;
}

/** The largest id the integer modelId column holds; a larger one could only fail in a query. */
export const MAX_MODEL_ID = 2_147_483_647;

/** What letting a model go of its media did. */
export interface ReleaseOutput {
    /** Media only the model had, deleted with their files. */
    deleted: number;
    /** Media other models still have, only detached from this one. */
    detached: number;
}

/** A service input together with its uploaded file. */
export type WithFile<T> = T & { file: Express.Multer.File };
