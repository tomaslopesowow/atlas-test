import { initGraphQLTada } from 'gql.tada';
import type { introspection } from './env.storefront.js';

export const graphql = initGraphQLTada<{
    introspection: introspection;
    scalars: {
        Decimal: string;
        URL: string;
    };
}>();
