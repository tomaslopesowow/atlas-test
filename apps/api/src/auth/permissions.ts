import type { PermissionName } from '@repo/rbac';

/** Every permission the api checks. */
export const Permission = {
    DeletePosts: 'delete:posts',
    DeleteComments: 'delete:comments',
    ReadRoles: 'read:roles',
    UpdateRoles: 'update:roles',
} as const satisfies Record<string, PermissionName>;

export const ADMIN_ROLE = 'admin';

export const MODERATOR_ROLE = 'moderator';

/** The roles every deploy has, and what they hold; the seeder adds what is missing at boot. */
export const ROLES: Record<string, PermissionName[]> = {
    [ADMIN_ROLE]: Object.values(Permission),
    [MODERATOR_ROLE]: [Permission.DeletePosts, Permission.DeleteComments],
};
