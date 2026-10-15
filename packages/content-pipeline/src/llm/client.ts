import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV3 } from '@ai-sdk/provider';

export type ContentPipelineModelOptions = {
    apiKey: string;
    articleModel?: string;
    fastModel?: string;
    dedupModel?: string;
};

export type ContentPipelineModels = {
    article: LanguageModelV3;
    fast: LanguageModelV3;
    dedup: LanguageModelV3;
};

export function createContentPipelineModels({
    apiKey,
    articleModel = 'claude-sonnet-4-6',
    fastModel = 'claude-haiku-4-5',
    dedupModel = fastModel,
}: ContentPipelineModelOptions): ContentPipelineModels {
    const anthropic = createAnthropic({ apiKey });
    return {
        article: anthropic(articleModel),
        fast: anthropic(fastModel),
        dedup: anthropic(dedupModel),
    };
}
