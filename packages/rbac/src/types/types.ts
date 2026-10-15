import type { EntityManager } from 'typeorm';
import type { PermissionsInput } from '../dto/permissions.input.js';

/** The usual actions, the first segment of a permission's name; any other word is an action too, e.g. `send`. */
export enum PermissionAction {
    Create = 'create',
    Read = 'read',
    Update = 'update',
    Delete = 'delete',
}

/** `read:posts` or `send:announcements`: an action, then what it applies to. */
export type PermissionName = `${string}:${string}`;

/** The largest id an integer column holds; a larger one could only fail in a query. */
export const MAX_ID = 2_147_483_647;

/** Who a role is attached to and checked for, e.g. `{ modelType: 'user', modelId: 5 }`. */
export interface RbacSubject {
    modelType: string;
    modelId: number;
}

export interface RoleNameInput {
    name: string;
}

export interface SubjectInput {
    subject: RbacSubject;
}

export interface RoleIdInput {
    roleId: number;
}

export interface FindRoleInput extends RoleIdInput {
    withPermissions?: boolean;
}

export interface RolePermissionsInput extends RoleIdInput, PermissionsInput {}

export interface PermissionIdsInput {
    ids: number[];
}

export interface SubjectCheckInput extends SubjectInput {
    names: string[];
}

export interface FindOrCreatePermissionsInput extends PermissionsInput {
    /** The transaction the permissions are created in. */
    manager: EntityManager;
}

export interface PermissionLinksInput extends RoleIdInput {
    manager: EntityManager;
}
