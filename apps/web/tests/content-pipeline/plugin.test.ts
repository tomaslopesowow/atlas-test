import type { CollectionConfig, CollectionSlug, Config, Field } from 'payload';
import { describe, expect, it } from 'vitest';
import {
    type ContentPipelinePluginOptions,
    contentPipelinePlugin,
} from '@/features/payload/features/content-pipeline/plugin';
import { taxonomyPlugin } from '@/features/payload/features/taxonomies/plugin';

const runtime: ContentPipelinePluginOptions['runtime'] = {
    dataForSeo: { login: 'login', password: 'password' },
    anthropic: { apiKey: 'anthropic' },
};

function collection(slug: string): CollectionConfig {
    return { slug, fields: [] };
}

function config(...collections: CollectionConfig[]): Config {
    return {
        collections,
        globals: [],
        custom: {},
    } as unknown as Config;
}

function pipeline(overrides: Partial<ContentPipelinePluginOptions> = {}) {
    return contentPipelinePlugin({
        enabled: true,
        articleCollection: 'pages',
        articleTaxonomies: ['news'],
        defaultArticleTaxonomy: 'news',
        locales: ['en', 'nl'],
        defaultLocale: 'en',
        runtime,
        ...overrides,
    });
}

const taxonomyFields: Field[] = [{ name: 'description', type: 'text' }];

describe('contentPipelinePlugin taxonomy dependency', () => {
    it('fails when the taxonomy plugin is missing or runs later', () => {
        expect(() => pipeline()(config(collection('pages')))).toThrow(
            'taxonomyPlugin must run before contentPipelinePlugin',
        );
    });

    it('fails when the article collection is missing', () => {
        expect(() => pipeline()(config(collection('articles')))).toThrow(
            'article collection "pages" is not registered',
        );
    });

    it('fails when taxonomy is registered on another collection', () => {
        const withTaxonomy = taxonomyPlugin({
            collection: 'articles' as CollectionSlug,
            taxonomies: { news: taxonomyFields },
        })(config(collection('pages'), collection('articles')));

        expect(() => pipeline()(withTaxonomy)).toThrow(
            'taxonomyPlugin must run before contentPipelinePlugin',
        );
    });

    it('fails when the allowed taxonomy is unavailable', () => {
        const withTaxonomy = taxonomyPlugin({
            collection: 'pages',
            taxonomies: { cases: taxonomyFields },
        })(config(collection('pages')));

        expect(() => pipeline()(withTaxonomy)).toThrow(
            'article taxonomies are not registered',
        );
    });

    it('fails when the default taxonomy is outside the allowlist', () => {
        const withTaxonomy = taxonomyPlugin({
            collection: 'pages',
            taxonomies: { news: taxonomyFields },
        })(config(collection('pages')));

        expect(() =>
            pipeline({ defaultArticleTaxonomy: 'cases' })(withTaxonomy),
        ).toThrow('default taxonomy "cases" is not in the article taxonomy');
    });

    it('fails when the default locale is unavailable', () => {
        const withTaxonomy = taxonomyPlugin({
            collection: 'pages',
            taxonomies: { news: taxonomyFields },
        })(config(collection('pages')));

        expect(() => pipeline({ defaultLocale: 'de' })(withTaxonomy)).toThrow(
            'default locale "de" is not registered',
        );
    });

    it('fails when required runtime credentials are missing', () => {
        const withTaxonomy = taxonomyPlugin({
            collection: 'pages',
            taxonomies: { news: taxonomyFields },
        })(config(collection('pages')));

        expect(() =>
            pipeline({
                runtime: {
                    dataForSeo: {},
                    anthropic: {},
                },
            })(withTaxonomy),
        ).toThrow('DATAFORSEO_LOGIN');
    });

    it('keeps deterministic hidden schema when disabled', () => {
        const result = pipeline({ enabled: false })(
            config(collection('pages')),
        );

        expect(
            result.collections?.find(
                ({ slug }) => slug === 'content-pipeline-topics',
            )?.admin?.hidden,
        ).toBe(true);
        expect(
            result.globals?.find(
                ({ slug }) => slug === 'content-pipeline-settings',
            )?.admin?.hidden,
        ).toBe(true);
    });

    it('initializes after a matching taxonomy plugin', () => {
        const withTaxonomy = taxonomyPlugin({
            collection: 'pages',
            taxonomies: { news: taxonomyFields },
        })(config(collection('pages')));

        const result = pipeline()(withTaxonomy);
        const pages = result.collections?.find(({ slug }) => slug === 'pages');

        expect(
            result.collections?.some(
                ({ slug }) => slug === 'content-pipeline-topics',
            ),
        ).toBe(true);
        expect(
            result.globals?.some(
                ({ slug }) => slug === 'content-pipeline-settings',
            ),
        ).toBe(true);
        expect(
            pages?.fields.some(
                (field) => 'name' in field && field.name === 'aiGenerated',
            ),
        ).toBe(true);
    });
});
