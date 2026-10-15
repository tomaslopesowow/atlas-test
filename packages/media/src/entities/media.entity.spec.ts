import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MediaEntity } from './media.entity.js';

const uuid = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';

const aMedia = (collectionName: string) =>
    Object.assign(new MediaEntity(), { id: uuid, collectionName });

describe('MediaEntity.directory', () => {
    it('nests the files under the collection, then the id', () => {
        assert.equal(aMedia('user.avatar').directory, `user.avatar/${uuid}`);
    });
});
