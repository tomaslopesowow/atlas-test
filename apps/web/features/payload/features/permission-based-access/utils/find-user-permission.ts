import { asDoc } from '@/features/payload/utils/as-doc';
import type { User } from '@/payload-types';
import { USER_FIELD_NAME_IS_SUPER_USER } from '../config/shared';
import type { GenericAccessConfig, UserWithRoles } from '../config/types';

/**
 * Determines if the provided user has the specified permission
 * based on their assigned roles.
 *
 * This function converts the user's roles into a Document-like format,
 * filters out any invalid or empty roles, and then checks if any role
 * grants permission for the given resource type, slug, and operation.
 *
 * @param user - The user object (or null if not authenticated).
 * @param kind - The type of resource ('collections' or 'globals').
 * @param slug - The identifier for the collection or global.
 * @param operation - The operation to verify permission for.
 * @returns True if the user has the permission; otherwise, false.
 */
export const userHasPermission = <
    TUser extends User & {
        collection: 'users';
    },
>(
    user: TUser | null,
    kind: 'collections' | 'globals',
    slug: string,
    operation: string,
) => {
    // Grant full, unconditional access to super users.
    if (user?.[USER_FIELD_NAME_IS_SUPER_USER]) return true;

    // Cast the user to UserWithRoles to access the roles property.
    // Map roles through asDoc, filter out any falsy values,
    // and check if any role grants the desired permission.
    return !!(user as unknown as UserWithRoles)?.roles
        ?.map(asDoc) // Transform each role to its document representation.
        .filter((e): e is NonNullable<typeof e> => !!e) // Remove any null or undefined roles.
        .some((profile) => {
            // Retrieve the access configuration for the specified resource.
            const accessConfig = (
                profile?.[kind] as GenericAccessConfig | null
            )?.[slug];

            // Return true if the access configuration for the operation is enabled.
            return accessConfig ? accessConfig[operation] : false;
        });
};
