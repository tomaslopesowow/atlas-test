import type { Access, CollectionConfig, GlobalConfig } from 'payload';
import {
    USER_FIELD_NAME_IS_SUPER_USER,
    USER_ROLES_SLUG,
} from '../config/shared';
import type { UserWithRoles } from '../config/types';
import { userHasPermission } from './find-user-permission';

export function createPBA(
    kind: 'collections',
    slug: string,
    operation:
        | keyof Omit<NonNullable<CollectionConfig['access']>, 'admin'>
        | 'readSelf',
): Access;

export function createPBA(
    kind: 'globals',
    slug: string,
    operation: keyof NonNullable<GlobalConfig['access']>,
): Access;

/**
 * Creates a Permission-Based Access (PBA) function for collections or globals.
 *
 * This function returns an access control function that checks whether a user is allowed to perform a given operation
 * on a specified collection or global resource.
 *
 * The returned function performs the following checks:
 * - Denies access if there is no authenticated user.
 * - Denies modifications (update or delete) on system roles in the user roles collection.
 * - Grants unconditional access to super users.
 * - Delegates the permission check to the findUserPermission function for further evaluation.
 *
 * @param kind - Indicates whether the target is a 'collections' or 'globals' resource.
 * @param slug - The unique identifier (slug) of the collection or global.
 * @param operation - The operation to be performed (e.g., 'read', 'create', 'update', 'delete', or 'readSelf').
 * @returns A function that takes an object with request and data properties and returns a boolean indicating whether access is granted.
 */
export function createPBA(
    kind: 'collections' | 'globals',
    slug: string,
    operation: string,
): Access {
    return ({ data, req }) => {
        // Retrieve the authenticated user from the request.
        // If no user is present, access is denied.
        const user = req.user as UserWithRoles | null;
        if (!user) return false;

        // Deny updates or deletions on system roles within the user roles collection.
        // The check prevents modifications if:
        // - The operation is either 'update' or 'delete'
        // - The resource is a collection
        // - The slug matches that of the user roles collection
        // - The data indicates that the target role is of type 'system'
        if (
            (operation === 'update' || operation === 'delete') &&
            kind === 'collections' &&
            slug === USER_ROLES_SLUG &&
            data?.type === 'system'
        ) {
            return false;
        }

        // Grant full, unconditional access to super users.
        if (user[USER_FIELD_NAME_IS_SUPER_USER]) return true;

        // Use findUserPermission to check if the user has the required permission
        // for the specified operation on the given resource.
        const hasAccess = userHasPermission(user, kind, slug, operation);

        return hasAccess;
    };
}
