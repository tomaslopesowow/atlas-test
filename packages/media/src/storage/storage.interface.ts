import type { MediaConfig } from '../media.config.js';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StoragePathInput {
    path: string;
}

export interface StoragePutInput extends StoragePathInput {
    buffer: Buffer;
    /** S3 serves the file with it; the local disk serves by extension. */
    contentType?: string;
}

export interface StoragePrefixInput {
    prefix: string;
}

export interface IStorageService {
    /** Recorded on each media row, so it stays known where its files live. */
    readonly disk: MediaConfig['disk'];

    /** Store a file at the given path, replacing one already there. */
    put(input: StoragePutInput): Promise<void>;

    /** Retrieve a file from the given path. */
    get(input: StoragePathInput): Promise<Buffer>;

    /** Delete every file under the given prefix. */
    deletePrefix(input: StoragePrefixInput): Promise<void>;

    /** Get the public URL for a file at the given path. */
    url(input: StoragePathInput): string;
}
