import type { AdminSchema, ResourceSchema } from '@repo/admin-contract';
import { NotFound } from './api';

// loaded once before any page renders, for the actions too, which are no components
let loaded: AdminSchema | null = null;

export const setSchema = (schema: AdminSchema) => {
    loaded = schema;
};

export function useSchema(): AdminSchema {
    if (!loaded)
        throw new Error('useSchema() before the app loaded the schema');

    return loaded;
}

/** A resource of the loaded schema, or NotFound, which a page shows as such. */
export function getResource(name: string | undefined): ResourceSchema {
    const resource = loaded?.resources.find((r) => r.name === name);

    if (!resource) throw new NotFound(`No resource "${name}"`);

    return resource;
}
