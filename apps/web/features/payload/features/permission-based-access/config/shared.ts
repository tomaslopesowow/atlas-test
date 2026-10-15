/**
 * The slug identifier for the user roles collection.
 */
export const USER_ROLES_SLUG = 'user-roles';

/**
 * The field name for storing roles in a user object.
 */
export const USER_FIELD_NAME_ROLES = 'roles';

/**
 * The field name that flags whether a user is a super user.
 */
export const USER_FIELD_NAME_IS_SUPER_USER = 'isSuperUser';

/**
 * The operation name for reading a user's own (authenticated) collection data.
 */
export const AUTH_COLLECTION_READ_SELF_OPERATION = 'readSelf';

/**
 * List of allowed operations on collections.
 */
export const COLLECTION_OPERATIONS = [
    'read',
    'readVersions',
    'create',
    'update',
    'delete',
] as const;

/**
 * List of allowed operations on globals.
 */
export const GLOBAL_OPERATIONS = [
    'read',
    'readDrafts',
    'readVersions',
    'update',
] as const;

/**
 * Enumerates the system-level roles.
 */
export enum SystemRole {
    Administrator = 'administrator',
}

/**
 * Enumerates custom roles that can be defined or edited by end users.
 */
export enum CustomRole {
    Editor = 'editor',
}
