import type { AppLocale } from '@repo/i18n/shared';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import type { Page, Settings } from '@/payload-types';
import { getPayloadClient } from '../client';

const LOG_PREFIX = '[route-alias]';

/**
 * A resolved route alias with populated source/target pages and computed paths.
 */
export type RouteAlias = {
    source: Page;
    target: Page;
    enabled: NonNullable<
        NonNullable<Settings['routeAliases']>[number]['enabled']
    >;
    id: NonNullable<NonNullable<Settings['routeAliases']>[number]['id']>;
    originalPath: string;
    resolvedPath: string;
};

/**
 * Resolves a route alias for a given pathname.
 *
 * Checks if the pathname starts with any aliased source page path,
 * and if so, returns the alias with transformed path information.
 *
 * @param pathnameWithoutLocale - The pathname to check (without locale prefix)
 * @returns The route alias if found, or null
 */
export const getRouteAlias = cache(
    async (pathnameWithoutLocale: string): Promise<RouteAlias | null> => {
        const [locale, payload] = await Promise.all([
            getLocale(),
            getPayloadClient(),
        ]);

        payload.logger.info(
            `${LOG_PREFIX} Resolving alias for path: ${pathnameWithoutLocale}`,
        );

        const settings = await payload.findGlobal({
            slug: 'settings',
            locale: locale as AppLocale,
            depth: 1,
        });

        const routeAliases = settings?.routeAliases;

        if (!routeAliases || !Array.isArray(routeAliases)) {
            payload.logger.info(`${LOG_PREFIX} No route aliases configured`);
            return null;
        }

        payload.logger.info(
            `${LOG_PREFIX} Found ${routeAliases.length} route alias(es)`,
        );

        for (const alias of routeAliases) {
            if (!alias.enabled || !alias.id) {
                payload.logger.info(
                    `${LOG_PREFIX} Skipping disabled or invalid alias`,
                );
                continue;
            }

            const source =
                typeof alias.source === 'object' ? alias.source : null;
            const target =
                typeof alias.target === 'object' ? alias.target : null;

            if (!source?.path || !target?.path) {
                payload.logger.info(
                    `${LOG_PREFIX} Skipping alias with missing source/target path`,
                );
                continue;
            }

            payload.logger.info(
                `${LOG_PREFIX} Checking alias: ${source.path} → ${target.path}`,
            );

            // Check if the pathname starts with the source page's path
            // Match exact path or path with trailing content (sub-pages)
            const sourcePath = source.path;
            if (
                pathnameWithoutLocale === sourcePath ||
                pathnameWithoutLocale.startsWith(`${sourcePath}/`)
            ) {
                // Transform the path: replace source prefix with target prefix
                const subPath = pathnameWithoutLocale.slice(sourcePath.length);
                const resolvedPath = `${target.path}${subPath}`;

                payload.logger.info(
                    `${LOG_PREFIX} Match found! Resolving ${pathnameWithoutLocale} → ${resolvedPath}`,
                );

                return {
                    source,
                    target,
                    enabled: alias.enabled,
                    id: alias.id,
                    originalPath: pathnameWithoutLocale,
                    resolvedPath,
                };
            }
        }

        payload.logger.info(
            `${LOG_PREFIX} No matching alias found for: ${pathnameWithoutLocale}`,
        );

        return null;
    },
);
