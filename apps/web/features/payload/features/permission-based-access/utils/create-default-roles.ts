import type { Config, Payload } from 'payload';
import { CustomRole, SystemRole, USER_ROLES_SLUG } from '../config/shared';
import type { KnownByPlugin } from '../config/types';
import type { PermissionBasedAccessPluginOptions } from '../plugin';
import { defaultRoles } from './default-roles';

/**
 * Creates default user roles (both system and custom) within the Payload CMS.
 *
 * This function iterates over the predefined system roles (from SystemRole) and custom roles (from CustomRole),
 * checks if each role exists in the user roles collection, and creates it if it does not already exist.
 *
 * @param payload - The Payload CMS instance used to interact with the database and logging.
 * @param config - The CMS configuration object.
 * @param options - Plugin options providing additional configuration.
 */
export const createDefaultRoles = async (
    payload: Payload,
    config: Config,
    options: PermissionBasedAccessPluginOptions<KnownByPlugin>,
) => {
    // Log the beginning of the default role creation process.
    payload.logger.info('Creating default user roles...');

    // Loop through each system role defined in SystemRole.
    for (const roleName of Object.values(SystemRole)) {
        payload.logger.info(`Creating system role "${roleName}"...`);

        // Check if the system role already exists in the user roles collection.
        const role = await payload
            .find({
                collection: USER_ROLES_SLUG as KnownByPlugin,
                limit: 1,
                where: {
                    and: [
                        { type: { equals: 'system' } },
                        { name: { equals: roleName } },
                    ],
                },
            })
            .then((res) => res.docs[0]);

        // If the role exists, log the information and skip further creation.
        if (role) {
            payload.logger.info(
                `System role "${roleName}" already exists! Skipping...`,
            );
            continue;
        }

        // Prepare the role data by merging default settings with role-specific properties.
        const roleData = {
            ...defaultRoles[roleName](config, options),
            name: roleName,
            type: 'system',
        };

        // Create the new system role in the user roles collection.
        await payload.create({
            collection: USER_ROLES_SLUG as KnownByPlugin,
            data: roleData,
        });
    }

    // Loop through each custom role defined in CustomRole.
    for (const roleName of Object.values(CustomRole)) {
        payload.logger.info(`Creating custom role "${roleName}"...`);

        // Check if the custom role already exists in the user roles collection.
        const role = await payload
            .find({
                collection: USER_ROLES_SLUG as KnownByPlugin,
                limit: 1,
                where: {
                    and: [
                        { type: { equals: 'custom' } },
                        { name: { equals: roleName } },
                    ],
                },
            })
            .then((res) => res.docs[0]);

        // If the role exists, log the information and skip creating it.
        if (role) {
            payload.logger.info(
                `Custom role "${roleName}" already exists! Skipping...`,
            );
            continue;
        }

        // Create the custom role with its default settings merged with its properties.
        await payload.create({
            collection: USER_ROLES_SLUG as KnownByPlugin,
            data: {
                ...defaultRoles[roleName](config, options),
                name: roleName,
                type: 'custom',
            },
        });
    }
};
