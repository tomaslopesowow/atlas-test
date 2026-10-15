import type { GlobalConfig } from 'payload';
import { DEFAULT_IMAGE_STYLE_PROMPT } from './load-settings';

type ContentPipelineSettingsOptions = {
    articleTaxonomies: string[];
    defaultArticleTaxonomy: string;
    locales: string[];
};

/**
 * Admin-editable configuration for the content pipeline.
 *
 * Operational knobs marketing should tune without a redeploy live here; secrets
 * (DataForSEO / Anthropic / fal.ai credentials) stay in env.
 */
export function createContentPipelineSettings({
    articleTaxonomies,
    defaultArticleTaxonomy,
    locales,
}: ContentPipelineSettingsOptions): GlobalConfig {
    const taxonomyOptions = articleTaxonomies.map((value) => ({
        label: value,
        value,
    }));

    return {
        slug: 'content-pipeline-settings',

        label: 'Content pipeline',

        typescript: {
            interface: 'ContentPipelineSettings',
        },

        admin: {
            group: 'Settings',
            description:
                'Seeds, business context, brand voice and limits for the automated keyword-research → article pipeline.',
        },

        fields: [
            {
                type: 'tabs',
                tabs: [
                    {
                        label: 'Business',
                        fields: [
                            {
                                name: 'businessContext',
                                type: 'textarea',
                                admin: {
                                    description:
                                        'What the business does, who it serves and what makes it credible. Woven into every brief and article so the writing sounds like a practitioner, not a generic SEO bot.',
                                },
                            },
                            {
                                name: 'industry',
                                type: 'text',
                                admin: {
                                    description:
                                        'e.g. "B2B project-management software". Sets the writer persona.',
                                },
                            },
                            {
                                name: 'audience',
                                type: 'text',
                                admin: {
                                    description:
                                        'Who the articles are for, e.g. "operations managers at mid-size agencies".',
                                },
                            },
                            {
                                name: 'experienceDomains',
                                type: 'text',
                                admin: {
                                    description:
                                        'Areas of hands-on experience to draw worked examples from, e.g. "campaign planning, client onboarding". Used for the E-E-A-T requirement.',
                                },
                            },
                        ],
                    },
                    {
                        label: 'Research',
                        fields: [
                            {
                                name: 'seedTerms',
                                type: 'array',
                                labels: {
                                    singular: 'Seed',
                                    plural: 'Seed terms',
                                },
                                admin: {
                                    description:
                                        'Seed keywords the research starts from, e.g. "project management software".',
                                },
                                fields: [
                                    {
                                        name: 'term',
                                        type: 'text',
                                        required: true,
                                    },
                                ],
                            },
                            {
                                name: 'competitorDomains',
                                type: 'array',
                                labels: {
                                    singular: 'Competitor',
                                    plural: 'Competitor domains',
                                },
                                admin: {
                                    description:
                                        'Optional competitor domains for keyword-gap analysis (e.g. example.com).',
                                },
                                fields: [
                                    {
                                        name: 'domain',
                                        type: 'text',
                                        required: true,
                                    },
                                ],
                            },
                            {
                                name: 'ownDomain',
                                type: 'text',
                                admin: {
                                    description:
                                        'Your domain (e.g. example.com). In competitor-gap analysis, keywords you already rank for in the top results are excluded.',
                                },
                            },
                            {
                                name: 'searchLocationCode',
                                type: 'number',
                                defaultValue: 2840,
                                admin: {
                                    description:
                                        'DataForSEO location code (2840 = United States, 2528 = Netherlands, 2826 = United Kingdom).',
                                },
                            },
                            {
                                name: 'searchLanguageCode',
                                type: 'text',
                                defaultValue: 'en',
                                admin: {
                                    description:
                                        'DataForSEO language code for research (e.g. en, nl).',
                                },
                            },
                            {
                                name: 'minVolume',
                                type: 'number',
                                defaultValue: 100,
                                admin: {
                                    description:
                                        'Drop keywords below this monthly search volume.',
                                },
                            },
                            {
                                name: 'maxDifficulty',
                                type: 'number',
                                defaultValue: 60,
                                admin: {
                                    description:
                                        'Drop keywords above this organic ranking difficulty (0–100).',
                                },
                            },
                        ],
                    },
                    {
                        label: 'Generation',
                        fields: [
                            {
                                name: 'runNow',
                                type: 'ui',
                                admin: {
                                    components: {
                                        Field: '@/features/payload/features/content-pipeline/payload/components/run-pipeline-button.tsx',
                                    },
                                },
                            },
                            {
                                name: 'brandVoice',
                                type: 'textarea',
                                defaultValue:
                                    'Direct, expert and pragmatic. Plain language, concrete and specific, no hype or buzzwords. Confident but never salesy.',
                                admin: {
                                    description:
                                        'Tone and style guidance injected into the article-writing prompt.',
                                },
                            },
                            {
                                name: 'targetLocales',
                                type: 'select',
                                hasMany: true,
                                defaultValue: [...locales],
                                options: locales.map((locale) => ({
                                    label: locale,
                                    value: locale,
                                })),
                                admin: {
                                    description:
                                        'Locales each article is generated in.',
                                },
                            },
                            {
                                name: 'postsPerWeek',
                                type: 'number',
                                defaultValue: 2,
                                admin: {
                                    description:
                                        'How many articles a weekly run generates.',
                                },
                            },
                            {
                                name: 'enableImageGeneration',
                                type: 'checkbox',
                                defaultValue: false,
                                admin: {
                                    description:
                                        'Generate a branded AI cover illustration for each draft (via fal.ai). Requires the FAL_KEY env var. Off by default.',
                                },
                            },
                            {
                                name: 'imageStylePrompt',
                                type: 'textarea',
                                defaultValue: DEFAULT_IMAGE_STYLE_PROMPT,
                                admin: {
                                    description:
                                        'Brand-style guidance woven into the image prompt. Keep it about look-and-feel (palette, shapes, mood) in plain words — avoid hex codes; the article topic is added automatically.',
                                    condition: (data) =>
                                        !!data?.enableImageGeneration,
                                },
                            },
                            {
                                name: 'imageAspectRatio',
                                type: 'select',
                                defaultValue: '16:9',
                                options: [
                                    {
                                        label: '16:9 (wide header)',
                                        value: '16:9',
                                    },
                                    { label: '4:3 (standard)', value: '4:3' },
                                    { label: '1:1 (square)', value: '1:1' },
                                ],
                                admin: {
                                    description:
                                        'Aspect ratio for generated cover images.',
                                    condition: (data) =>
                                        !!data?.enableImageGeneration,
                                },
                            },
                            {
                                name: 'notificationEmails',
                                type: 'array',
                                labels: {
                                    singular: 'Recipient',
                                    plural: 'Notification emails',
                                },
                                admin: {
                                    description:
                                        'Who gets emailed when a run creates new drafts to review.',
                                },
                                fields: [
                                    {
                                        name: 'email',
                                        type: 'email',
                                        required: true,
                                    },
                                ],
                            },
                            {
                                name: 'dedupSensitivity',
                                type: 'select',
                                defaultValue: 'duplicates-only',
                                options: [
                                    { label: 'Off', value: 'off' },
                                    {
                                        label: 'Duplicates only',
                                        value: 'duplicates-only',
                                    },
                                    {
                                        label: 'Strict (also near-dups)',
                                        value: 'strict',
                                    },
                                ],
                                admin: {
                                    description:
                                        'How aggressively to skip topics that overlap an existing topic or page. "Duplicates only" blocks repeats; "Strict" also blocks near-duplicates that would cannibalise; "Off" disables the check.',
                                },
                            },
                            {
                                name: 'taxonomyType',
                                type: 'select',
                                defaultValue: defaultArticleTaxonomy,
                                options: taxonomyOptions,
                                admin: {
                                    description:
                                        'Taxonomy type assigned to generated article pages. The matching "overview page" must be set under Settings → <type> so generated pages get a public URL, and you build the index by dropping the matching list block (e.g. news-list) on a page.',
                                },
                            },
                            {
                                name: 'defaultAuthor',
                                type: 'relationship',
                                relationTo: 'people',
                                admin: {
                                    description:
                                        'Optional author byline for generated pages.',
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    };
}
