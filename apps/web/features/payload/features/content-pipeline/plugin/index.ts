import type { CollectionSlug, Config } from 'payload';
import { getTaxonomyCapabilities } from '../../taxonomies/plugin';
import { createContentPipelineSettings } from '../payload/settings-global';
import { createContentPipelineTopics } from '../payload/topics-collection';
import { CONTENT_PIPELINE_PROVENANCE_FIELDS } from './fields';

const CONTENT_PIPELINE_RUNTIME_KEY = 'atlasContentPipeline';

export type ContentPipelineRuntimeConfig = {
    dataForSeo: {
        login?: string;
        password?: string;
    };
    anthropic: {
        apiKey?: string;
        articleModel?: string;
        fastModel?: string;
        dedupModel?: string;
    };
    fal?: {
        apiKey?: string;
        model?: string;
        style?: string;
        maxAttempts?: number;
    };
    mastra?: {
        url?: string;
        authToken?: string;
    };
    adminBaseUrl?: string;
};

export type ContentPipelinePluginOptions = {
    enabled?: boolean;
    articleCollection?: CollectionSlug;
    articleTaxonomies: string[];
    defaultArticleTaxonomy: string;
    locales: string[];
    defaultLocale: string;
    runtime: ContentPipelineRuntimeConfig;
};

export function getContentPipelineRuntime(
    config: Pick<Config, 'custom'>,
): ContentPipelineRuntimeConfig | undefined {
    return config.custom?.[CONTENT_PIPELINE_RUNTIME_KEY] as
        | ContentPipelineRuntimeConfig
        | undefined;
}

function validateEnabledConfiguration(
    config: Config,
    options: Required<
        Pick<
            ContentPipelinePluginOptions,
            'articleCollection' | 'defaultArticleTaxonomy' | 'defaultLocale'
        >
    > &
        Pick<
            ContentPipelinePluginOptions,
            'articleTaxonomies' | 'locales' | 'runtime'
        >,
): void {
    const collection = config.collections?.find(
        ({ slug }) => slug === options.articleCollection,
    );
    if (!collection) {
        throw new Error(
            `[content-pipeline] article collection "${options.articleCollection}" is not registered.`,
        );
    }

    const taxonomy = getTaxonomyCapabilities(config, options.articleCollection);
    if (!taxonomy) {
        throw new Error(
            `[content-pipeline] taxonomyPlugin must run before contentPipelinePlugin for collection "${options.articleCollection}".`,
        );
    }

    const unavailable = options.articleTaxonomies.filter(
        (slug) => !taxonomy.slugs.includes(slug),
    );
    if (unavailable.length) {
        throw new Error(
            `[content-pipeline] article taxonomies are not registered on "${options.articleCollection}": ${unavailable.join(', ')}.`,
        );
    }

    if (!options.articleTaxonomies.includes(options.defaultArticleTaxonomy)) {
        throw new Error(
            `[content-pipeline] default taxonomy "${options.defaultArticleTaxonomy}" is not in the article taxonomy allowlist.`,
        );
    }

    if (!options.locales.includes(options.defaultLocale)) {
        throw new Error(
            `[content-pipeline] default locale "${options.defaultLocale}" is not registered.`,
        );
    }

    if (
        !options.runtime.dataForSeo.login ||
        !options.runtime.dataForSeo.password ||
        !options.runtime.anthropic.apiKey
    ) {
        throw new Error(
            '[content-pipeline] DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, and ANTHROPIC_API_KEY are required when enabled.',
        );
    }
}

export const contentPipelinePlugin =
    ({
        enabled = false,
        articleCollection = 'pages',
        articleTaxonomies,
        defaultArticleTaxonomy,
        locales,
        defaultLocale,
        runtime,
    }: ContentPipelinePluginOptions) =>
    (incomingConfig: Config): Config => {
        const config = {
            ...incomingConfig,
            custom: {
                ...incomingConfig.custom,
                [CONTENT_PIPELINE_RUNTIME_KEY]: runtime,
            },
        };

        if (enabled) {
            validateEnabledConfiguration(config, {
                articleCollection,
                articleTaxonomies,
                defaultArticleTaxonomy,
                locales,
                defaultLocale,
                runtime,
            });
        }

        const adminHidden = enabled ? {} : { hidden: true };
        const topics = createContentPipelineTopics(articleCollection);
        const settings = createContentPipelineSettings({
            articleTaxonomies,
            defaultArticleTaxonomy,
            locales,
        });

        config.collections = [
            ...(config.collections ?? []),
            {
                ...topics,
                admin: { ...topics.admin, ...adminHidden },
            },
        ];
        config.globals = [
            ...(config.globals ?? []),
            {
                ...settings,
                admin: { ...settings.admin, ...adminHidden },
            },
        ];

        const collection = config.collections.find(
            ({ slug }) => slug === articleCollection,
        );
        if (collection) {
            collection.fields = [
                ...collection.fields,
                ...CONTENT_PIPELINE_PROVENANCE_FIELDS,
            ];
        }

        return config;
    };
