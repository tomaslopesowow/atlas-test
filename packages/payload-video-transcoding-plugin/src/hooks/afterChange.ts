import type { CollectionAfterChangeHook } from 'payload';
import { VideoHostingApi } from '../lib/api';
import type {
    CollectionConfig,
    CollectionVariant,
    PayloadVideoTranscodingPluginConfig,
    SizeKey,
    Variant,
} from '../lib/types';
import { checkIncludesMimeType } from '../utils/mime';

interface Options {
    collectionSlug: string;
    collectionConfig: CollectionConfig;
    pluginOptions: PayloadVideoTranscodingPluginConfig;
}

interface VariantWithKeys {
    key: string;
    sizeKey: SizeKey;
    variant: CollectionVariant;
}

function generateKey(variant: CollectionVariant) {
    const key = crypto.randomUUID();
    const size = [variant.width, variant.height]
        .filter((e) => !(typeof e === 'number'))
        .join('x');
    if (size.length >= 1) {
        return `${key}-${size}.${variant.format}`;
    }

    return `${key}.${variant.format}`;
}

export function createAfterChange({
    collectionSlug,
    collectionConfig,
    pluginOptions,
}: Options): CollectionAfterChangeHook {
    return async ({ doc, req, context }) => {
        if (context.skipTranscode) {
            return;
        }

        if (!checkIncludesMimeType(collectionConfig.mimeTypes, doc.mimeType)) {
            return;
        }

        const api = new VideoHostingApi({
            bucket: collectionConfig.bucket,
            endpoint: pluginOptions.apiEndpoint,
            acl: collectionConfig.acl,
            webhook: collectionConfig.webhook
                ? new URL(
                      `/api/${collectionSlug}/webhooks/transcode`,
                      req.headers.get('origin') ?? undefined,
                  )
                : undefined,
            credentials: {
                apiClientId: pluginOptions.apiClientId,
                apiClientSecret: pluginOptions.apiClientSecret,
            },
        });

        req.payload.logger.info(
            'media afterChange: start transcoding video...',
        );

        const variants: VariantWithKeys[] = Object.entries(
            collectionConfig.variants,
        ).map(([sizeKey, variant]) => {
            return {
                key: generateKey(variant),
                sizeKey: sizeKey,
                variant: variant,
            };
        });

        const apiVariants: Variant[] = variants.map((entry) => {
            return {
                ...entry.variant,
                key: entry.key,
            };
        });

        const result = await api.transcode(doc.filename, apiVariants);

        const thumbnail = Object.values(variants).find(
            (e) => e.variant.type === 'thumbnail',
        );
        const videoVariants = variants.filter(
            (e) => e.variant.type === 'video',
        );
        const videoVariantEntries = videoVariants.map((variant) => [
            variant.sizeKey,
            {
                url: new URL(variant.key, pluginOptions.cdn).href,
                key: variant.key,
                status: 'waiting',
                jobId: result.outputs.find(
                    (output) => output.key === variant.key,
                )?.jobId,
            },
        ]);

        const updateData = {
            transcodeId: result.id,
            videoVariants: Object.fromEntries(videoVariantEntries),
            sizes: {
                thumbnail: thumbnail
                    ? {
                          url: new URL(thumbnail.key, pluginOptions.cdn).href,
                      }
                    : undefined,
            },
        };

        await req.payload.update({
            collection: collectionSlug,
            id: doc.id,
            data: updateData,
            context: {
                // To prevent an infite loop of `afterChange` calls.
                skipTranscode: true,
            },
        });
    };
}
