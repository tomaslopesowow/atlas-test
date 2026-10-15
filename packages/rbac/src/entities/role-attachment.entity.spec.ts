import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { RoleAttachmentEntity } from './role-attachment.entity.js';

describe('RoleAttachmentEntity', () => {
    it('lets the database drop the links of a deleted role', () => {
        const relation = getMetadataArgsStorage().relations.find(
            (relation) =>
                relation.target === RoleAttachmentEntity &&
                relation.propertyName === 'role',
        );

        assert.equal(relation?.options.onDelete, 'CASCADE');
    });

    it('lets the database refuse a second link of a role to the same subject, even from two concurrent attachRole calls', () => {
        const unique = getMetadataArgsStorage().uniques.find(
            (unique) => unique.target === RoleAttachmentEntity,
        );

        assert.deepEqual(
            unique?.columns,
            ['modelType', 'modelId', 'roleId'],
            'subject first, so the same index serves every check, which looks up by subject',
        );
    });
});
