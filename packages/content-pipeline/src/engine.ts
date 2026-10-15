import {
    createDataForSeoClient,
    type DataForSeoClient,
} from './dataforseo/client';
import {
    fetchKeywordIdeas,
    type KeywordIdeasParams,
} from './dataforseo/keyword-ideas';
import {
    fetchPeopleAlsoAsk,
    type PeopleAlsoAskParams,
} from './dataforseo/people-also-ask';
import {
    fetchRankedKeywords,
    type RankedKeywordsParams,
} from './dataforseo/ranked-keywords';
import { fetchKeywordResearch } from './dataforseo/research';
import type { FalImageOptions } from './images/client';
import { createImageService, type ImageService } from './images/service';
import {
    type ContentPipelineModelOptions,
    createContentPipelineModels,
} from './llm/client';
import { createCategoryClassifierAgent } from './mastra/agents/category-classifier';
import { createDedupJudgeAgent } from './mastra/agents/dedup-judge';
import { createSeoAgents } from './mastra/agents/seo-writer';
import { generateArticle, generateBrief } from './mastra/generate';
import {
    createInternalLinksTool,
    type FindInternalLinks,
} from './mastra/tools/internal-links.tool';
import { createKeywordResearchTool } from './mastra/tools/keyword-research.tool';

export type ContentPipelineLogger = {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
};

export type ContentPipelineEngineOptions = {
    dataForSeo: {
        login: string;
        password: string;
    };
    anthropic: ContentPipelineModelOptions;
    defaultLocale: string;
    findInternalLinks: FindInternalLinks;
    logger: ContentPipelineLogger;
    fal?: FalImageOptions;
};

type Tail<T extends unknown[]> = T extends [unknown, ...infer Rest]
    ? Rest
    : never;

export type ContentPipelineEngine = {
    dataForSeo: DataForSeoClient;
    agents: {
        seoWriterAgent: ReturnType<typeof createSeoAgents>['seoWriterAgent'];
        seoStrategistAgent: ReturnType<
            typeof createSeoAgents
        >['seoStrategistAgent'];
        dedupJudgeAgent: ReturnType<typeof createDedupJudgeAgent>;
        categoryClassifierAgent: ReturnType<
            typeof createCategoryClassifierAgent
        >;
    };
    research: {
        keywordIdeas(
            params: KeywordIdeasParams,
        ): ReturnType<typeof fetchKeywordIdeas>;
        keywordResearch(
            params: KeywordIdeasParams,
        ): ReturnType<typeof fetchKeywordResearch>;
        peopleAlsoAsk(
            params: PeopleAlsoAskParams,
        ): ReturnType<typeof fetchPeopleAlsoAsk>;
        rankedKeywords(
            params: RankedKeywordsParams,
        ): ReturnType<typeof fetchRankedKeywords>;
    };
    generation: {
        generateBrief(
            ...args: Tail<Parameters<typeof generateBrief>>
        ): ReturnType<typeof generateBrief>;
        generateArticle(
            ...args: Tail<Parameters<typeof generateArticle>>
        ): ReturnType<typeof generateArticle>;
    };
    images: ImageService | null;
};

export function createContentPipelineEngine(
    options: ContentPipelineEngineOptions,
): ContentPipelineEngine {
    const dataForSeo = createDataForSeoClient(options.dataForSeo);
    const models = createContentPipelineModels(options.anthropic);
    const seoAgents = createSeoAgents({
        models,
        internalLinksTool: createInternalLinksTool({
            defaultLocale: options.defaultLocale,
            findInternalLinks: options.findInternalLinks,
        }),
        keywordResearchTool: createKeywordResearchTool(dataForSeo),
    });
    const images = options.fal
        ? createImageService({
              fal: options.fal,
              strategistAgent: seoAgents.seoStrategistAgent,
              qaModel: models.fast,
              logger: options.logger,
          })
        : null;

    return {
        dataForSeo,
        agents: {
            ...seoAgents,
            dedupJudgeAgent: createDedupJudgeAgent(models.dedup),
            categoryClassifierAgent: createCategoryClassifierAgent(
                models.dedup,
            ),
        },
        research: {
            keywordIdeas: (params: KeywordIdeasParams) =>
                fetchKeywordIdeas(dataForSeo, params),
            keywordResearch: (params: KeywordIdeasParams) =>
                fetchKeywordResearch(dataForSeo, params, (message) =>
                    options.logger.warn(message),
                ),
            peopleAlsoAsk: (params: PeopleAlsoAskParams) =>
                fetchPeopleAlsoAsk(dataForSeo, params),
            rankedKeywords: (params: RankedKeywordsParams) =>
                fetchRankedKeywords(dataForSeo, params),
        },
        generation: {
            generateBrief: (...args: Tail<Parameters<typeof generateBrief>>) =>
                generateBrief(seoAgents, ...args),
            generateArticle: (
                ...args: Tail<Parameters<typeof generateArticle>>
            ) => generateArticle(seoAgents, ...args),
        },
        images,
    };
}
