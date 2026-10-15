import type { PermissionsInput } from '../dto/permissions.input.js';

/** `read:posts` or `send:announcements`: an action, then what it applies to. */
export type PermissionName = `${string}:${string}`;

/** The model a role is attached to and checked for; modelType is its entity's table name, e.g. `{ modelType: 'user', modelId: 5 }`. */
export interface ModelRef {
    modelType: string;
    modelId: number;
}

export interface RoleNameInput {
    name: string;
}

export interface RoleIdInput {
    roleId: number;
}

export interface RolePermissionsInput extends RoleIdInput, PermissionsInput {}

export interface PermissionIdsInput {
    ids: number[];
}
