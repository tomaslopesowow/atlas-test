import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ContentPipelineLogger } from '../engine';
import type { SeoAgents } from '../mastra/agents/seo-writer';
import type { ArticleBrief } from '../mastra/schemas';
import { generateAltText } from './alt-text';
import {
    createFalImageGenerator,
    type FalImageOptions,
    type GeneratedImage,
} from './client';
import { generateVisualConcept } from './concept';
import { buildImagePrompt } from './prompt';
import { inspectImageForText } from './qa';

export type HeroImageAsset = GeneratedImage & {
    altByLocale: Record<string, string>;
    baseName: string;
};

export type HeroImageRequest = {
    brief: ArticleBrief;
    stylePrompt?: string;
    aspectRatio: string;
    titlesByLocale: Record<string, string | undefined>;
};

type ImageServiceOptions = {
    fal: FalImageOptions;
    strategistAgent: SeoAgents['seoStrategistAgent'];
    qaModel: LanguageModelV3;
    logger: ContentPipelineLogger;
};

function imageBaseName(primaryKeyword: string): string {
    const slug = primaryKeyword
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return `pipeline-${slug || 'hero'}`;
}

export function createImageService(options: ImageServiceOptions) {
    const generator = createFalImageGenerator(options.fal);

    async function generateCleanImage(
        makePrompt: () => Promise<string>,
        aspectRatio: string,
        title: string,
    ): Promise<GeneratedImage | null> {
        let prompt = await makePrompt();

        for (let attempt = 1; attempt <= generator.maxAttempts; attempt++) {
            let candidate: GeneratedImage;
            try {
                candidate = await generator.generate({ prompt, aspectRatio });
            } catch (error) {
                options.logger.warn(
                    `Content pipeline: image generation failed for "${title}" (attempt ${attempt}/${generator.maxAttempts}: ${
                        error instanceof Error ? error.message : String(error)
                    })${
                        attempt < generator.maxAttempts
                            ? ' — retrying with a fresh concept.'
                            : ' — giving up; post will have no cover image.'
                    }`,
                );
                if (attempt < generator.maxAttempts) {
                    prompt = await makePrompt();
                }
                continue;
            }

            const verdict = await inspectImageForText(
                options.qaModel,
                candidate.buffer,
                candidate.mimetype,
            );
            if (verdict === 'clean') return candidate;
            if (verdict === 'qa-unavailable') {
                options.logger.warn(
                    `Content pipeline: image QA gate unavailable for "${title}" (attempt ${attempt}/${generator.maxAttempts}) — accepting the generated image unvetted rather than burning another generation.`,
                );
                return candidate;
            }
            options.logger.warn(
                `Content pipeline: image QA gate flagged text/charts for "${title}" (attempt ${attempt}/${generator.maxAttempts})${
                    attempt < generator.maxAttempts
                        ? ' — regenerating.'
                        : ' — giving up; post will have no cover image.'
                }`,
            );
        }

        return null;
    }

    return {
        async createHeroImage(
            request: HeroImageRequest,
        ): Promise<HeroImageAsset | null> {
            const makePrompt = async () =>
                buildImagePrompt(
                    await generateVisualConcept(
                        options.strategistAgent,
                        request.brief,
                    ),
                    {
                        stylePrompt: request.stylePrompt,
                        maxLength: generator.promptMaxLength,
                    },
                );
            const image = await generateCleanImage(
                makePrompt,
                request.aspectRatio,
                request.brief.title,
            );
            if (!image) return null;

            const altByLocale: Record<string, string> = {};
            for (const [locale, title] of Object.entries(
                request.titlesByLocale,
            )) {
                if (!title) continue;
                try {
                    altByLocale[locale] = await generateAltText(
                        options.strategistAgent,
                        { title, languageCode: locale },
                    );
                } catch {
                    altByLocale[locale] = title;
                }
            }

            return {
                ...image,
                altByLocale,
                baseName: imageBaseName(request.brief.primaryKeyword),
            };
        },
    };
}

export type ImageService = ReturnType<typeof createImageService>;
