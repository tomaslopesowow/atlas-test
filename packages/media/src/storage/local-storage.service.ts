import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { MediaConfig } from '../media.config.js';
import type {
    IStorageService,
    StoragePathInput,
    StoragePathsInput,
    StoragePrefixInput,
    StoragePutInput,
} from './storage.interface.js';

export class LocalStorageService implements IStorageService {
    readonly disk = 'local';
    readonly urlPrefix = '/uploads';
    readonly root: string;

    // resolved once, so a later change of working directory cannot move the uploads
    constructor({ path }: MediaConfig['local']) {
        this.root = resolve(path);
    }

    async put({ path, buffer }: StoragePutInput): Promise<void> {
        const fullPath = this.fullPath({ path });

        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, buffer);
    }

    async get({ path }: StoragePathInput): Promise<Buffer> {
        return readFile(this.fullPath({ path }));
    }

    async delete({ paths }: StoragePathsInput): Promise<void> {
        await Promise.all(
            paths.map((path) => rm(this.fullPath({ path }), { force: true })),
        );
    }

    async deletePrefix({ prefix }: StoragePrefixInput): Promise<void> {
        await rm(this.fullPath({ path: prefix }), {
            recursive: true,
            force: true,
            // a conversion still being written lands in the directory mid-removal, which then is not empty
            maxRetries: 3,
        });
    }

    async exists({ path }: StoragePathInput): Promise<boolean> {
        try {
            await access(this.fullPath({ path }));

            return true;
        } catch (error) {
            const { code } = error as NodeJS.ErrnoException;

            // ENOTDIR: a part of the path is a file, so nothing can be below it
            if (code === 'ENOENT' || code === 'ENOTDIR') return false;

            throw error;
        }
    }

    url({ path }: StoragePathInput): string {
        return `${this.urlPrefix}/${path}`;
    }

    // strictly inside the root: '../x' would escape it, and '' would let deletePrefix wipe it
    private fullPath({ path }: StoragePathInput): string {
        const fullPath = resolve(this.root, path);

        if (!fullPath.startsWith(`${this.root}${sep}`))
            throw new Error(`"${path}" is outside the storage root`);

        return fullPath;
    }
}
