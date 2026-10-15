import { SetMetadata } from '@nestjs/common';
import type { PermissionName } from '../types/types.js';

export const ROLES_KEY = 'rbac:roles';
export const PERMISSIONS_KEY = 'rbac:permissions';

// an empty list would replace the controller's requirements and leave the route public
const requireOne = (decorator: string, values: unknown[]) => {
    if (values.length === 0)
        throw new Error(`@${decorator}() needs at least one argument`);
};

/** Passes when the subject has at least one of the roles. */
export const HasRole = (...roles: string[]) => {
    requireOne('HasRole', roles);
    return SetMetadata(ROLES_KEY, roles);
};

/** Passes when the subject has every one of the permissions. */
export const HasPermission = (...permissions: PermissionName[]) => {
    requireOne('HasPermission', permissions);
    return SetMetadata(PERMISSIONS_KEY, permissions);
};
