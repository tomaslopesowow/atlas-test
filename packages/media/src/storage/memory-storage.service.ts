import type {
    IStorageService,
    StoragePathInput,
    StoragePrefixInput,
    StoragePutInput,
} from './storage.interface.js';

/** Keeps files in memory, for an app's tests: swap it in for STORAGE_SERVICE and nothing touches the disk. */
export class MemoryStorageService implements IStorageService {
    readonly disk = 'local';
    readonly files = new Map<string, Buffer>();

    async put({ path, buffer }: StoragePutInput): Promise<void> {
        this.files.set(path, buffer);
    }

    async get({ path }: StoragePathInput): Promise<Buffer> {
        const file = this.files.get(path);

        if (!file) throw new Error(`No file at ${path}`);

        return file;
    }

    async deletePrefix({ prefix }: StoragePrefixInput): Promise<void> {
        // the trailing slash keeps a sibling with the same leading characters safe
        const directory = `${prefix.replace(/\/+$/, '')}/`;

        for (const path of this.files.keys())
            if (path.startsWith(directory)) this.files.delete(path);
    }

    url({ path }: StoragePathInput): string {
        return `/uploads/${path}`;
    }
}
