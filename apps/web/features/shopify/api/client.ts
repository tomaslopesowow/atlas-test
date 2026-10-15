import { type Client, createClient, fetchExchange } from '@urql/core';
import { registerUrql } from '@urql/next/rsc';
import type { ResultOf, TadaDocumentNode, VariablesOf } from 'gql.tada';
import {
    SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    SHOPIFY_ADMIN_API_VERSION,
    SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_PUBLIC_ACCESS_TOKEN,
    SHOPIFY_STOREFRONT_API_VERSION,
} from '../config/shared';
import * as Sentry from '@sentry/nextjs';

const exchanges = [fetchExchange];

export const {
    /**
     * Payload GraphQL client for both server and client side usage.
     */
    getClient: getShopifyStorefrontClient,
} = registerUrql(() =>
    createClient({
        url: String(
            new URL(
                `api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`,
                SHOPIFY_STORE_DOMAIN,
            ),
        ),
        exchanges,
        fetchOptions: {
            cache: 'no-store',
            headers: {
                'X-Shopify-Storefront-Access-Token':
                    SHOPIFY_STOREFRONT_API_PUBLIC_ACCESS_TOKEN,
            },
        },
    }),
);

export const {
    /**
     * Payload GraphQL client for server side usage.
     */
    getClient: getShopifyAdminClient,
} = registerUrql(() =>
    createClient({
        url: String(
            new URL(
                `admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
                SHOPIFY_STORE_DOMAIN,
            ),
        ),
        exchanges,
        fetchOptions: {
            cache: 'no-store',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
            },
        },
    }),
);

const buildQueryFn =
    (client: Client) =>
    async <
        // biome-ignore lint/suspicious/noExplicitAny: inferred from usage
        TDocument extends TadaDocumentNode<any, any, any>,
        TResult = ResultOf<TDocument>,
    >(
        {
            query,
            variables,
        }: {
            query: TDocument;
            variables: VariablesOf<TDocument>;
        },
        selector?: (data?: ResultOf<TDocument>) => TResult,
    ) => {
        const operationResult = await client
            .query(query, variables)
            .toPromise();

        if (operationResult.error) {
            if (process.env.NODE_ENV === 'development') {
                console.error(operationResult.error);
            } else {
                Sentry.captureException(operationResult.error, {
                    extra: { query, variables, operationResult },
                });
            }
        }

        return (
            selector
                ? selector(operationResult.data as ResultOf<TDocument>)
                : operationResult.data
        ) as TResult;
    };

export const storefrontQuery = buildQueryFn(getShopifyStorefrontClient());
export const adminQuery = buildQueryFn(getShopifyAdminClient());
