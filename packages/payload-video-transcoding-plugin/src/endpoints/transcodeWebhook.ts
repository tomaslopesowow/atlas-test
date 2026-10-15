import type { Endpoint, PayloadRequest } from 'payload';
import type {
    CollectionConfig,
    JobResponse,
    JobStatus,
    PayloadVideoTranscodingPluginConfig,
    Variant,
} from '../lib/types';

interface WebhookBody {
    key: string;
    bucket: string;
    variant: Variant;
    job: JobResponse;
    transcodeId: string;
}

interface Options {
    collectionSlug: string;
    collectionConfig: CollectionConfig;
    pluginOptions: PayloadVideoTranscodingPluginConfig;
}

interface VideoVariant {
    key: string;
    jobId: string;
    status: JobStatus;
}
type VideoVariants = Record<string, VideoVariant>;

export function createTranscodeWebhook({
    collectionSlug,
    pluginOptions,
}: Options): Endpoint {
    return {
        method: 'post',
        path: '/webhooks/transcode',
        handler: async (request: PayloadRequest): Promise<Response> => {
            if (typeof request.json !== 'function') {
                return Response.json(
                    { error: 'Internal Server Error' },
                    { status: 500 },
                );
            }

            const body: WebhookBody = await request.json();

            const result = await request.payload.find({
                collection: collectionSlug,
                where: { transcodeId: { equals: body.transcodeId } },
                limit: 1,
            });

            if (result.docs.length <= 0) {
                return Response.json({ error: 'Not Found' }, { status: 404 });
            }

            const doc = result.docs[0];

            if (!doc.videoVariants) {
                return Response.json({ error: 'Not Found' }, { status: 404 });
            }

            const videoVariants: VideoVariants = doc.videoVariants;

            const sizeKey = Object.entries(videoVariants).find(
                ([_, value]) =>
                    value.key === body.variant.key &&
                    value.jobId === body.job.id,
            )?.[0];

            if (!sizeKey) {
                return Response.json({ error: 'Not Found' }, { status: 404 });
            }

            try {
                request.payload.logger.info(
                    `Updating document: ${doc.id}, sizeKey: ${sizeKey}, status: ${body.job.status}`,
                );
                // @ts-expect-error - fix this later - cannot do direct mongodb updates because plugin
                await request.payload.db.collections[collectionSlug].updateOne(
                    { _id: doc.id },
                    {
                        $set: {
                            [`videoVariants.${sizeKey}.status`]:
                                body.job.status,
                        },
                    },
                );
            } catch (e) {
                return Response.json(
                    { message: 'Internal server error' },
                    { status: 500 },
                );
            }

            return new Response(null, { status: 204 });
        },
    };
}
