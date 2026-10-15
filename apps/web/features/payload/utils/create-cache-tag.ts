import type { Config } from '@/payload-types';

const COMMON_CACHE_TAG_PREFIX = 'payload';
const GLOBAL_CACHE_TAG_PREFIX = 'global';
const COLLECTION_CACHE_TAG_PREFIX = 'collection';

/**
 * Creates a cache tag for a global configuration.
 *
 * This function generates a cache tag string for a given global configuration. The cache tag is constructed by joining
 * predefined prefixes with the global configuration's slug, separated by underscores.
 *
 * @param global - The global configuration object, which must include a slug.
 * @returns The generated cache tag string.
 */
export function createCacheTagForGlobal(global: keyof Config['globals']) {
    return [COMMON_CACHE_TAG_PREFIX, GLOBAL_CACHE_TAG_PREFIX, global].join('_');
}

/**
 * Creates a cache tag for a collection.
 *
 * This function generates a cache tag string for a given collection, optionally including an identifier.
 * The cache tag is constructed by joining predefined prefixes with the collection's slug and the optional identifier,
 * separated by underscores. Any falsy values (e.g., an undefined `identifier`) are omitted from the final string.
 *
 * @param collection - The collection configuration object, which must include a slug.
 * @param identifier - The optional identifier of a specific document within the collection. For example a document ID or other unique field value, like a slug.
 * @returns The generated cache tag string.
 */
export function createCacheTagForCollection(
    collection: keyof Config['collections'],
    identifier?: string,
) {
    return [
        COMMON_CACHE_TAG_PREFIX,
        COLLECTION_CACHE_TAG_PREFIX,
        collection,
        identifier,
    ]
        .filter(Boolean)
        .join('_');
}
