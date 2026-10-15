import assert from 'node:assert/strict';
import {
    access,
    chmod,
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
    it('keeps its files under the configured root', () => {
        assert.equal(storage.root, root);
        assert.equal(storage.disk, 'local');
    });

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

    it('replaces a file that is already there', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('first'),
        });
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('second'),
        });

        assert.equal(
            (await readFile(join(root, 'a/original.png'))).toString(),
            'second',
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

    it('rejects for a file that is not there', async () => {
        await assert.rejects(storage.get({ path: 'a/missing.png' }), {
            code: 'ENOENT',
        });
    });
});

describe('LocalStorageService.delete', () => {
    it('deletes one file and leaves its neighbours', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });
        await storage.put({
            path: 'a/square.webp',
            buffer: Buffer.from('webp'),
        });

        await storage.delete({ paths: ['a/square.webp'] });

        assert.equal(await storage.exists({ path: 'a/square.webp' }), false);
        assert.equal(await storage.exists({ path: 'a/original.png' }), true);
    });

    it('deletes every file of a list', async () => {
        await storage.put({ path: 'a/one.png', buffer: Buffer.from('1') });
        await storage.put({ path: 'b/two.png', buffer: Buffer.from('2') });

        await storage.delete({ paths: ['a/one.png', 'b/two.png'] });

        assert.equal(await storage.exists({ path: 'a/one.png' }), false);
        assert.equal(await storage.exists({ path: 'b/two.png' }), false);
    });

    it('ignores a file that is already gone', async () => {
        await assert.doesNotReject(
            storage.delete({ paths: ['a/missing.png'] }),
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

    it('leaves a sibling whose name starts the same', async () => {
        await storage.put({
            path: 'user.avatar/u1/original.png',
            buffer: Buffer.from('png'),
        });
        await storage.put({
            path: 'user.avatar/u10/original.png',
            buffer: Buffer.from('png'),
        });

        await storage.deletePrefix({ prefix: 'user.avatar/u1' });

        assert.equal(
            await storage.exists({ path: 'user.avatar/u10/original.png' }),
            true,
        );
    });

    it('ignores a directory that is not there', async () => {
        await assert.doesNotReject(
            storage.deletePrefix({ prefix: 'user.avatar/missing' }),
        );
    });
});

describe('LocalStorageService.exists', () => {
    it('is true for a stored file and false for a missing one', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        assert.equal(await storage.exists({ path: 'a/original.png' }), true);
        assert.equal(await storage.exists({ path: 'a/missing.png' }), false);
    });

    it('is false below a file, where nothing can be', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        assert.equal(
            await storage.exists({ path: 'a/original.png/inside.png' }),
            false,
        );
    });

    it('rejects when it cannot look, rather than calling the file missing', {
        // root reads through any permission
        skip: process.getuid?.() === 0,
    }, async () => {
        await storage.put({
            path: 'locked/original.png',
            buffer: Buffer.from('png'),
        });
        await chmod(join(root, 'locked'), 0o000);

        try {
            await assert.rejects(
                storage.exists({ path: 'locked/original.png' }),
                { code: 'EACCES' },
            );
        } finally {
            await chmod(join(root, 'locked'), 0o755);
        }
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
        await assert.rejects(
            storage.delete({ paths: ['../keep/file.txt'] }),
            outside,
        );

        assert.equal(await exists(join(sandbox, 'keep/file.txt')), true);
    });

    it('refuses to look outside its root', async () => {
        await assert.rejects(storage.exists({ path: '../keep' }), outside);
    });

    it('refuses the root itself, so deletePrefix cannot wipe every upload', async () => {
        await storage.put({
            path: 'a/original.png',
            buffer: Buffer.from('png'),
        });

        for (const prefix of ['', '.', 'a/..'])
            await assert.rejects(storage.deletePrefix({ prefix }), outside);

        assert.equal(await storage.exists({ path: 'a/original.png' }), true);
    });

    it('accepts a name that merely starts with two dots', async () => {
        await storage.put({
            path: '..cache/original.png',
            buffer: Buffer.from('png'),
        });

        assert.equal(await exists(join(root, '..cache/original.png')), true);
    });
});
