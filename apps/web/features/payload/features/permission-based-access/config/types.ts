import type { User } from '@/payload-types';
import type { CollectionSlug, GlobalSlug, Operation } from 'payload';
import {
    AUTH_COLLECTION_READ_SELF_OPERATION,
    type GLOBAL_OPERATIONS,
    USER_FIELD_NAME_IS_SUPER_USER,
    USER_FIELD_NAME_ROLES,
} from './shared';

/**
 * Configuration options for access permissions on a collection.
 * Maps each general operation (e.g., read, create, update, delete) to a boolean flag.
 * Additionally supports a self-read operation and version reading.
 */
export type CollectionAccessConfig = {
    [key in Operation]?: boolean;
} & {
    [AUTH_COLLECTION_READ_SELF_OPERATION]?: boolean;
    readVersions?: boolean;
};

/**
 * Configuration options for access permissions on globals.
 * Maps each allowed global operation (as defined in GLOBAL_OPERATIONS) to a boolean flag.
 */
export type GlobalAccessConfig = {
    [key in (typeof GLOBAL_OPERATIONS)[number]]?: boolean;
};

/**
 * A generic access configuration mapping arbitrary permission keys to boolean flags.
 */
export type GenericAccessConfig = Record<string, Record<string, boolean>>;

/**
 * A drop-in user role type, useful when the plugin is not enabled.
 */
export type UserRole = {
    id: string;
    name: string;
    collections?: {
        [key in CollectionSlug]?: CollectionAccessConfig;
    };
    globals?: {
        [key in GlobalSlug]?: GlobalAccessConfig;
    };
    createdAt: string;
    updatedAt: string;
};

/**
 * Augmented User type that includes associated roles and a collection identifier.
 *
 * The generic parameter TCollection allows specifying the precise collection slug type.
 */
// biome-ignore lint/suspicious/noExplicitAny: collection may not be unknown at this point
export type UserWithRoles<TCollection extends CollectionSlug = any> = User & {
    /**
     * The collection slug associated with the user.
     */
    collection: TCollection;
} & {
    /**
     * Array of roles assigned to the user, or null if not set.
     */
    [USER_FIELD_NAME_ROLES]?: UserRole[] | null;
    /**
     * Flag indicating whether the user has super user privileges.
     */
    [USER_FIELD_NAME_IS_SUPER_USER]: boolean;
};

/**
 * Placeholder for plugin-specific generated types.
 *
 * This type is used as a fallback when the plugin is not enabled.
 */
// biome-ignore lint/suspicious/noExplicitAny: Used to represent omitted generated types when the plugin is not enabled
export type KnownByPlugin = any;
