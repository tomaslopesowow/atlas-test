import assert from 'node:assert/strict';
import {
    access,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { LocalStorageService } from './local-storage.service.js';

const exists = (path: string) =>
    access(path).then(
        () => true,
        () => false,
    );

// the root sits inside a throwaway sandbox, so a path escaping it stays disposable
let sandbox: string;
let root: string;
let storage: LocalStorageService;

beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'atlas-media-'));
    root = join(sandbox, 'uploads');
    storage = new LocalStorageService({ path: root });
});

afterEach(() => rm(sandbox, { recursive: true, force: true }));

describe('LocalStorageService', () => {
    it('resolves a relative root once, against the working directory it started in', () => {
        assert.equal(
            new LocalStorageService({ path: './uploads' }).root,
            resolve('./uploads'),
        );
    });
});

describe('LocalStorageService.put', () => {
    it('writes the file under the root, creating its directories', async () => {
        await storage.put({
            path: 'user.avatar/u1/original.png',
            buffer: Buffer.from('png'),
        });

        assert.deepEqual(
            await readFile(join(root, 'user.avatar/u1/original.png')),
            Buffer.from('png'),
        );
    });
});

describe('LocalStorageService.get', () => {
    it('reads back what was put', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        assert.deepEqual(
            await storage.get({ path: 'a/original.png' }),
            Buffer.from('png'),
        );
    });
});

describe('LocalStorageService.deletePrefix', () => {
    it('removes a directory with everything in it', async () => {
        await storage.put({
            path: 'user.avatar/u1/original.png',
            buffer: Buffer.from('png'),
        });
        await storage.put({
            path: 'user.avatar/u1/nested/deep.webp',
            buffer: Buffer.from('w'),
        });

        await storage.deletePrefix({ prefix: 'user.avatar/u1' });

        assert.equal(await exists(join(root, 'user.avatar/u1')), false);
    });

    it('ignores a directory that is not there', async () => {
        await assert.doesNotReject(
            storage.deletePrefix({ prefix: 'user.avatar/missing' }),
        );
    });
});

describe('LocalStorageService.url', () => {
    it('serves every file under /uploads, wherever the root is', () => {
        assert.equal(
            storage.url({ path: 'user.avatar/u1/original.png' }),
            '/uploads/user.avatar/u1/original.png',
        );
    });
});

describe('LocalStorageService outside its root', () => {
    const outside = /outside the storage root/;

    it('refuses to write outside its root', async () => {
        await assert.rejects(
            storage.put({ path: '../escape.txt', buffer: Buffer.from('x') }),
            outside,
        );

        assert.equal(await exists(join(sandbox, 'escape.txt')), false);
    });

    it('refuses to read outside its root', async () => {
        await writeFile(join(sandbox, 'secret.txt'), 'secret');

        await assert.rejects(storage.get({ path: '../secret.txt' }), outside);
    });

    it('refuses to delete outside its root', async () => {
        await mkdir(join(sandbox, 'keep'));
        await writeFile(join(sandbox, 'keep/file.txt'), 'keep');

        await assert.rejects(
            storage.deletePrefix({ prefix: '../keep' }),
            outside,
        );

        assert.equal(await exists(join(sandbox, 'keep/file.txt')), true);
    });

    it('refuses the root itself, so deletePrefix cannot wipe every upload', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        for (const prefix of ['', '.', 'a/..'])
            await assert.rejects(storage.deletePrefix({ prefix }), outside);

        assert.equal(await exists(join(root, 'a/original.png')), true);
    });

    it('accepts a name that merely starts with two dots', async () => {
        await storage.put({
            path: '..cache/original.png',
            buffer: Buffer.from('png'),
        });

        assert.equal(await exists(join(root, '..cache/original.png')), true);
    });
});
