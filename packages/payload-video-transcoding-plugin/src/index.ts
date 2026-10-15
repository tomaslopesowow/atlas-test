import type { Config } from 'payload';
import VideoVariantStatusCell from './components/VideoVariantStatusCell';
import { createTranscodeWebhook } from './endpoints/transcodeWebhook';
import { createVideoVariantFields } from './fields/videoVariants';
import { createAfterChange } from './hooks/afterChange';
import type { PayloadVideoTranscodingPluginConfig } from './lib/types';

export { VideoVariantStatusCell };

export const payloadVideoTranscodingPlugin =
    (pluginOptions: PayloadVideoTranscodingPluginConfig) =>
    (config: Config): Config => {
        const enabled =
            typeof pluginOptions.enabled === 'boolean'
                ? pluginOptions.enabled
                : true;
        if (!config.collections) {
            config.collections = [];
        }

        if (pluginOptions.collections) {
            for (const [collectionSlug, collectionConfig] of Object.entries(
                pluginOptions.collections,
            )) {
                const collection = config.collections.find(
                    (collection) => collection.slug === collectionSlug,
                );

                if (!collectionConfig || !collection) {
                    continue;
                }

                if (!collection.hooks) {
                    collection.hooks = {};
                }

                if (!collection.hooks.afterChange) {
                    collection.hooks.afterChange = [];
                }

                if (!collection.endpoints) {
                    collection.endpoints = [];
                }

                if (!collection.defaultPopulate) {
                    collection.defaultPopulate = {};
                }

                collection.defaultPopulate.videoVariants = true;

                collection.fields.push(
                    ...createVideoVariantFields(collectionConfig),
                );

                if (enabled) {
                    collection.hooks.afterChange.push(
                        createAfterChange({
                            collectionSlug,
                            collectionConfig,
                            pluginOptions,
                        }),
                    );
                }

                if (enabled && collectionConfig.webhook) {
                    collection.endpoints.push(
                        createTranscodeWebhook({
                            collectionSlug,
                            collectionConfig,
                            pluginOptions,
                        }),
                    );
                }
            }
        }

        return config;
    };
