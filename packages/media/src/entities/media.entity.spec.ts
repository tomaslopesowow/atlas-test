import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { MediaEntity } from './media.entity.js';
import { MediaAttachmentEntity } from './media-attachment.entity.js';

const uuid = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';

const aMedia = (collectionName: string) =>
    Object.assign(new MediaEntity(), { id: uuid, collectionName });

const relation = (target: object, propertyName: string) =>
    getMetadataArgsStorage().relations.find(
        (relation) =>
            relation.target === target &&
            relation.propertyName === propertyName,
    );

describe('MediaEntity.directory', () => {
    it('nests the files under the collection, then the id', () => {
        assert.equal(aMedia('user.avatar').directory, `user.avatar/${uuid}`);
    });
});

describe('MediaEntity.attachments', () => {
    it('inserts new attachments along with the media, so one save links an upload', () => {
        assert.deepEqual(
            relation(MediaEntity, 'attachments')?.options.cascade,
            ['insert'],
        );
    });

    it('allows one link per media and model, keyed model first for the lookups by model', () => {
        const unique = getMetadataArgsStorage().uniques.find(
            ({ target }) => target === MediaAttachmentEntity,
        );

        assert.deepEqual(unique?.columns, ['modelType', 'modelId', 'media']);
    });

    it('lets the database drop the links of a deleted media', () => {
        assert.equal(
            relation(MediaAttachmentEntity, 'media')?.options.onDelete,
            'CASCADE',
        );
    });
});
