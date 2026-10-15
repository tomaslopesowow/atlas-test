import type { Config } from 'payload';
import { Ecommerce } from '@/globals/ecommerce';
import { syncShopifyProductsEndpoints } from '@/sync/endpoints';

export interface ShopifyPluginOptions {
    enabled?: boolean;
}

export const shopifyPlugin =
    (options: ShopifyPluginOptions = {}) =>
    (incomingConfig: Config): Config => {
        if (!options.enabled) {
            return incomingConfig;
        }

        const config = { ...incomingConfig };

        config.globals = [...(config.globals ?? []), Ecommerce];

        config.endpoints = [
            ...(config.endpoints ?? []),
            ...syncShopifyProductsEndpoints,
        ];

        return config;
    };
