import type { CollectionConfig, CollectionSlug, Config } from 'payload';
import {
    AUTH_COLLECTION_READ_SELF_OPERATION,
    COLLECTION_OPERATIONS,
    GLOBAL_OPERATIONS,
    USER_FIELD_NAME_IS_SUPER_USER,
    USER_FIELD_NAME_ROLES,
    USER_ROLES_SLUG,
} from '../config/shared';
import type { KnownByPlugin } from '../config/types';
import { createDefaultRoles } from '../utils/create-default-roles';
import {
    createPermissionCheckbox,
    createPermissionsGroup,
} from '../utils/create-fields';
import { createPBA } from '../utils/create-pba';
import { userHasPermission } from '../utils/find-user-permission';

/**
 * Plugin options for the Permission Based Access Plugin.
 *
 * @param collection - The slug of the users collection (excluding the user roles collection slug).
 */
export type PermissionBasedAccessPluginOptions<
    TCollection extends Exclude<CollectionSlug, typeof USER_ROLES_SLUG>,
> = {
    collection: TCollection;
};

/**
 * Permission Based Access Plugin that augments the Payload configuration with extra access controls
 * and default roles for collections and globals.
 *
 * This plugin enhances the configuration by:
 * - Verifying the users collection exists and has auth enabled.
 * - Adding fields to the users collection for role management and a super user flag.
 * - Creating a dedicated collection configuration for user roles with static access controls.
 * - Overriding access functions for collections and globals to include permission based checks.
 * - Initializing default roles using the onInit hook.
 *
 * @param options - Options for the plugin including the target users collection slug.
 * @returns A function that receives the incoming config and returns the updated config.
 */
export const permissionBasedAccessPlugin =
    <TCollection extends Exclude<CollectionSlug, typeof USER_ROLES_SLUG>>(
        options: PermissionBasedAccessPluginOptions<TCollection>,
    ) =>
    async (incomingConfig: Config) => {
        const { collection: userCollectionSlug } = options;

        // Create a shallow copy of the incoming configuration for modification
        const config = { ...incomingConfig };

        // Find the users collection configuration in the provided config.collections array
        const usersCollection = config.collections?.find(
            (c) => c.slug === userCollectionSlug,
        );

        if (!usersCollection) {
            throw new Error(
                `Collection "${userCollectionSlug}" not found in config.collections`,
            );
        }

        if (!usersCollection.auth) {
            throw new Error(
                `Collection "${userCollectionSlug}" does not have auth enabled`,
            );
        }

        // Add custom fields to the users collection:
        // - A relationship field for roles.
        // - A checkbox field to denote super user status (always false and disabled).
        usersCollection.fields.push(
            {
                name: USER_FIELD_NAME_ROLES,
                type: 'relationship',
                hasMany: true,
                relationTo: USER_ROLES_SLUG as KnownByPlugin,
                access: {
                    create: ({ req: { user } }) =>
                        userHasPermission(
                            user,
                            'collections',
                            USER_ROLES_SLUG,
                            'create',
                        ),
                    read: ({ req: { user } }) =>
                        userHasPermission(
                            user,
                            'collections',
                            USER_ROLES_SLUG,
                            'read',
                        ),
                    update: ({ req: { user } }) =>
                        userHasPermission(
                            user,
                            'collections',
                            USER_ROLES_SLUG,
                            'update',
                        ),
                },
            },
            {
                name: USER_FIELD_NAME_IS_SUPER_USER,
                type: 'checkbox',
                defaultValue: false,

                // Disable the super user checkbox in the admin panel
                admin: {
                    disabled: true,
                },

                // Prevent modification of the super user flag
                access: {
                    update: () => false,
                    create: () => false,
                },
            },
        );

        // Define the collection configuration for user roles
        const userRolesConfig: CollectionConfig = {
            slug: USER_ROLES_SLUG,

            admin: {
                useAsTitle: 'name',
            },

            // Disable the GraphQL API for this collection to prevent direct modifications
            graphQL: {
                disableMutations: true,
                disableQueries: true,
            },

            fields: [
                {
                    name: 'name',
                    type: 'text',
                    required: true,
                    unique: true,
                },

                {
                    name: 'type',
                    type: 'select',
                    options: ['system', 'custom'],
                    defaultValue: 'custom',

                    admin: {
                        readOnly: true,
                    },

                    // Prevent modification of role types after creation
                    access: {
                        create: () => false,
                        update: () => false,
                    },

                    // Ensure any duplication of a role always results in a custom role
                    hooks: {
                        beforeDuplicate: [() => 'custom'],
                    },
                },

                {
                    name: 'collections',
                    type: 'group',

                    admin: {
                        components: {
                            Cell: '@/features/payload/features/permission-based-access/components/cell',
                        },
                    },

                    fields: [
                        // Create a default permissions group for the user roles collection itself
                        createPermissionsGroup({
                            name: USER_ROLES_SLUG,
                            fields: COLLECTION_OPERATIONS.map((name) =>
                                createPermissionCheckbox(name),
                            ),
                        }),

                        // For each collection in the config, create a permissions group
                        ...(config.collections?.map((collection) => {
                            const fields = COLLECTION_OPERATIONS.map((name) =>
                                createPermissionCheckbox(name, collection),
                            );

                            // For the users collection, add the readSelf permission checkbox at the beginning
                            if (collection.slug === userCollectionSlug) {
                                const checkbox = createPermissionCheckbox(
                                    AUTH_COLLECTION_READ_SELF_OPERATION,
                                    collection,
                                );
                                checkbox.defaultValue = true;
                                fields.unshift(checkbox);
                            }

                            return createPermissionsGroup({
                                name: collection.slug,
                                fields,
                            });
                        }) ?? []),
                    ].sort(({ name: a }, { name: b }) => {
                        // Sort the user roles collection first
                        const rankA =
                            a === USER_ROLES_SLUG
                                ? 0
                                : a === userCollectionSlug
                                  ? 1
                                  : 2;

                        // Sort the users collection next
                        const rankB =
                            b === USER_ROLES_SLUG
                                ? 0
                                : b === userCollectionSlug
                                  ? 1
                                  : 2;

                        // Sort the rest of the collections alphabetically
                        return rankA !== rankB
                            ? rankA - rankB
                            : a.localeCompare(b);
                    }),
                },

                {
                    name: 'globals',
                    type: 'group',

                    admin: {
                        components: {
                            Cell: '@/features/payload/features/permission-based-access/components/cell',
                        },
                    },

                    fields:
                        // Create a permissions group for each global in the configuration
                        (
                            config.globals?.map((global) =>
                                createPermissionsGroup({
                                    name: global.slug,
                                    fields: GLOBAL_OPERATIONS.map((name) =>
                                        createPermissionCheckbox(name, global),
                                    ),
                                }),
                            ) ?? []
                        ).sort(({ name: a }, { name: b }) => {
                            // Sort the globals alphabetically
                            return a.localeCompare(b);
                        }),
                },
            ],
        };

        // Append the user roles configuration to the collections array and update access controls on collections
        config.collections = [
            ...(config.collections ?? []),
            userRolesConfig,
        ].map((collection) => {
            const { slug } = collection;

            // Enhance each collection's access object with permission based rules
            collection.access = {
                read: (args) => {
                    // Default read permission
                    const pba = createPBA('collections', slug, 'read');

                    // For non-user collections, return the default read access result
                    if (slug !== userCollectionSlug) return pba(args);

                    // For the users collection, determine if the requested record belongs to the authenticated user
                    // and evaluate the readSelf permission
                    const selfPba = createPBA('collections', slug, 'readSelf');
                    const hasPermission = pba(args);
                    const hasSelfPermission = selfPba(args);
                    const isSelf = args.req.user?.id === args.data?.id;

                    // Grant access if either the normal read or readSelf (when accessing own record) permission passes
                    return hasPermission || (isSelf && hasSelfPermission);
                },

                create: createPBA('collections', slug, 'create'),
                update: createPBA('collections', slug, 'update'),
                delete: createPBA('collections', slug, 'delete'),

                // Merge with any existing access rules defined on the collection
                // This allows collections to overwrite the plugin's access rules
                ...collection.access,
            };

            return collection;
        });

        // Update global configurations by enhancing their access controls with permission based rules
        config.globals = [...(config.globals ?? [])].map((global) => {
            const { slug } = global;

            global.access = {
                read: createPBA('globals', slug, 'read'),
                readDrafts: createPBA('globals', slug, 'readDrafts'),
                readVersions: createPBA('globals', slug, 'readVersions'),
                update: createPBA('globals', slug, 'update'),

                // Merge with any existing access rules defined on the global
                // This allows globals to overwrite the plugin's access rules
                ...global.access,
            };

            return global;
        });

        // Setup the onInit hook to create default roles when the Payload CMS initializes
        config.onInit = async (payload) => {
            await createDefaultRoles(payload, config, options);
            await incomingConfig.onInit?.(payload);
        };

        // Return the modified configuration
        return config;
    };
