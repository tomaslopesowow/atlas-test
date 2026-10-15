import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryStorageService } from './memory-storage.service.js';

describe('MemoryStorageService', () => {
    it('deletes only under the prefix, not a sibling sharing its leading characters', async () => {
        const storage = new MemoryStorageService();

        for (const path of ['a/1/original.png', 'a/10/original.png'])
            await storage.put({ path, buffer: Buffer.from(path) });

        await storage.deletePrefix({ prefix: 'a/1' });

        assert.deepEqual([...storage.files.keys()], ['a/10/original.png']);
    });

    it('rejects reading a file that is not there', async () => {
        await assert.rejects(
            new MemoryStorageService().get({ path: 'a/1/original.png' }),
            /No file at a\/1\/original\.png/,
        );
    });
});
