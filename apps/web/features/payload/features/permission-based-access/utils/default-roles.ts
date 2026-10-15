import type { Config } from 'payload';
import {
    AUTH_COLLECTION_READ_SELF_OPERATION,
    COLLECTION_OPERATIONS,
    CustomRole,
    GLOBAL_OPERATIONS,
    SystemRole,
    USER_ROLES_SLUG,
} from '../config/shared';
import type {
    CollectionAccessConfig,
    GlobalAccessConfig,
    KnownByPlugin,
    UserRole,
} from '../config/types';
import type { PermissionBasedAccessPluginOptions } from '../plugin';

/**
 * A mapping of system and custom roles to their respective configuration functions.
 * Each role has a function that returns the initial configuration for that role.
 */
export const defaultRoles: Record<
    SystemRole | CustomRole,
    (
        config: Config,
        options: PermissionBasedAccessPluginOptions<KnownByPlugin>,
    ) => Pick<UserRole, 'collections' | 'globals'>
> = {
    [SystemRole.Administrator]: (config: Config) => ({
        // initialize all operations to true
        collections: config.collections?.reduce(
            (acc, collection) => {
                acc[collection.slug] = (
                    [
                        AUTH_COLLECTION_READ_SELF_OPERATION,
                        ...COLLECTION_OPERATIONS,
                    ] as const
                ).reduce((acc, operation) => {
                    acc[operation] = true;
                    return acc;
                }, {} as CollectionAccessConfig);

                return acc;
            },
            {} as Record<string, CollectionAccessConfig>,
        ),

        // initialize all operations to true
        globals: config.globals?.reduce(
            (acc, global) => {
                acc[global.slug] = GLOBAL_OPERATIONS.reduce(
                    (acc, operation) => {
                        acc[operation] = true;
                        return acc;
                    },
                    {} as GlobalAccessConfig,
                );

                return acc;
            },
            {} as Record<string, GlobalAccessConfig>,
        ),
    }),

    [CustomRole.Editor]: (
        config: Config,
        { collection: userCollectionSlug },
    ) => ({
        // initialize read/update/create to true, unless the collection is user-roles
        collections: config.collections?.reduce(
            (acc, collection) => {
                if (collection.slug === USER_ROLES_SLUG) {
                    acc[collection.slug] = { read: true };
                    return acc;
                }

                if (collection.slug === userCollectionSlug) {
                    acc[collection.slug] = {
                        [AUTH_COLLECTION_READ_SELF_OPERATION]: true,
                        read: true,
                    };

                    return acc;
                }

                acc[collection.slug] = COLLECTION_OPERATIONS.reduce(
                    (acc, operation) => {
                        if (collection.versions && operation === 'delete') {
                            acc[operation] = false;
                            return acc;
                        }

                        acc[operation] = true;
                        return acc;
                    },
                    {} as CollectionAccessConfig,
                );

                return acc;
            },
            {} as Record<string, CollectionAccessConfig>,
        ),

        // initialize all operations to true
        globals: config.globals?.reduce(
            (acc, global) => {
                acc[global.slug] = GLOBAL_OPERATIONS.reduce(
                    (acc, operation) => {
                        acc[operation] = true;
                        return acc;
                    },
                    {} as GlobalAccessConfig,
                );

                return acc;
            },
            {} as Record<string, GlobalAccessConfig>,
        ),
    }),
};
