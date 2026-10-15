import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { RoleEntity } from './role.entity.js';
import { RoleAttachmentEntity } from './role-attachment.entity.js';

const relation = (target: object, propertyName: string) =>
    getMetadataArgsStorage().relations.find(
        (relation) =>
            relation.target === target &&
            relation.propertyName === propertyName,
    );

/** Resolves `(role) => role.attachments` to `'attachments'`, as TypeORM does with a map of property names. */
const inverseSide = (target: object, propertyName: string) => {
    const inverse = relation(target, propertyName)?.inverseSideProperty;

    return typeof inverse === 'function'
        ? inverse(new Proxy({}, { get: (_, key) => key }))
        : inverse;
};

describe('RoleEntity.permissions', () => {
    it('lets one permission belong to many roles', () => {
        assert.equal(
            relation(RoleEntity, 'permissions')?.relationType,
            'many-to-many',
        );
    });
});

describe('RoleEntity.attachments', () => {
    it('lists the links of the role to its subjects, so a check joins from a role to them in one query', () => {
        const attachments = relation(RoleEntity, 'attachments');

        assert.equal(attachments?.relationType, 'one-to-many');
        assert.equal(
            (attachments?.type as () => unknown)(),
            RoleAttachmentEntity,
        );
    });

    it('is the other side of RoleAttachmentEntity.role, not a second relation', () => {
        assert.equal(inverseSide(RoleEntity, 'attachments'), 'role');
        assert.equal(inverseSide(RoleAttachmentEntity, 'role'), 'attachments');
    });
});

describe('RoleEntity.name', () => {
    it('is unique, as createRole assumes when it checks for a taken name', () => {
        const column = getMetadataArgsStorage().columns.find(
            (column) =>
                column.target === RoleEntity && column.propertyName === 'name',
        );

        assert.equal(column?.options.unique, true);
    });
});
