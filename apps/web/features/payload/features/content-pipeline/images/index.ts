import type { ContentPipelineEngine } from '@repo/content-pipeline/engine';
import type { ArticleBrief } from '@repo/content-pipeline/mastra/schemas';
import type { AppLocale } from '@repo/i18n/shared';
import type { Payload } from 'payload';
import type { PipelineSettings } from '../payload/load-settings';
import { uploadImageAsMedia } from './upload-media';

export async function createHeroImageForTopic(
    payload: Payload,
    engine: ContentPipelineEngine,
    brief: ArticleBrief,
    settings: PipelineSettings,
    titlesByLocale: Partial<Record<AppLocale, string>>,
): Promise<string | null> {
    if (!engine.images) return null;

    try {
        const image = await engine.images.createHeroImage({
            brief,
            stylePrompt: settings.imageStylePrompt,
            aspectRatio: settings.imageAspectRatio,
            titlesByLocale,
        });
        if (!image) return null;

        const mediaId = await uploadImageAsMedia(payload, image);
        payload.logger.info(
            `Content pipeline: generated hero image (media ${mediaId}) for "${brief.title}".`,
        );
        return mediaId;
    } catch (error) {
        payload.logger.warn(
            `Content pipeline: hero image generation failed for "${brief.title}" (${
                error instanceof Error ? error.message : String(error)
            }) — draft will be created without a cover image.`,
        );
        return null;
    }
}
