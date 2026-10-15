import type { CollectionConfig, CollectionSlug } from 'payload';

/**
 * Keyword clusters surfaced by the research pipeline.
 *
 * Serves three jobs: cross-run dedup (the unique `clusterKey`), an audit trail
 * of what research found and whether it became a post, and the per-week run
 * record (`runWeek`) the scheduled trigger uses for idempotency. This is
 * pipeline bookkeeping, not editorial content, so it lives in the Content admin
 * group but is read-mostly for editors.
 */
export function createContentPipelineTopics(
    articleCollection: CollectionSlug,
): CollectionConfig {
    return {
        slug: 'content-pipeline-topics',

        labels: {
            singular: 'Pipeline topic',
            plural: 'Pipeline topics',
        },

        admin: {
            group: 'Content',
            useAsTitle: 'title',
            defaultColumns: ['title', 'status', 'score', 'runWeek'],
            description: 'Keyword clusters discovered by the content pipeline.',
        },

        fields: [
            {
                name: 'clusterKey',
                type: 'text',
                required: true,
                index: true,
                unique: true,
                admin: {
                    description: 'Normalized primary keyword — the dedup key.',
                },
            },
            {
                name: 'title',
                type: 'text',
                admin: {
                    description: 'Proposed article title from the brief.',
                },
            },
            {
                name: 'status',
                type: 'select',
                required: true,
                defaultValue: 'queued',
                options: [
                    { label: 'Queued', value: 'queued' },
                    { label: 'Generating', value: 'generating' },
                    { label: 'Drafted', value: 'drafted' },
                    { label: 'Published', value: 'published' },
                    { label: 'Rejected', value: 'rejected' },
                ],
                admin: { position: 'sidebar' },
            },
            {
                name: 'source',
                type: 'select',
                required: true,
                defaultValue: 'seed',
                options: [
                    { label: 'Seed research', value: 'seed' },
                    { label: 'Competitor gap', value: 'competitor' },
                ],
                admin: {
                    position: 'sidebar',
                    description: 'Where this topic came from.',
                },
            },
            {
                name: 'runWeek',
                type: 'text',
                index: true,
                admin: {
                    position: 'sidebar',
                    description:
                        'ISO week of the run that found it, e.g. 2026-W23.',
                },
            },
            {
                name: 'score',
                type: 'number',
                admin: { position: 'sidebar' },
            },
            {
                name: 'qualityScore',
                type: 'number',
                admin: {
                    position: 'sidebar',
                    description:
                        'Generated-article quality (0–100) from the pipeline eval gate. Below the floor the topic is rejected instead of drafted.',
                },
            },
            {
                name: 'qualityFlags',
                type: 'json',
                admin: {
                    position: 'sidebar',
                    readOnly: true,
                    description:
                        'Quality-gate flags recorded for the generated draft (e.g. short, few sections, missing keyword).',
                },
            },
            {
                name: 'dedupReason',
                type: 'text',
                admin: {
                    position: 'sidebar',
                    readOnly: true,
                    description:
                        'Why the near-duplicate gate dropped or flagged this topic (set on rejected dedup topics).',
                },
            },
            {
                name: 'duplicateOf',
                type: 'text',
                admin: {
                    position: 'sidebar',
                    readOnly: true,
                    description:
                        'The closest existing item the gate matched, as "topic:<id>" or "post:<id>".',
                },
            },
            {
                name: 'primaryKeyword',
                type: 'text',
            },
            {
                name: 'competitorDomain',
                type: 'text',
                admin: {
                    description:
                        'Competitor ranking for the primary keyword (competitor-gap topics).',
                },
            },
            {
                name: 'competitorRank',
                type: 'number',
                admin: {
                    position: 'sidebar',
                    description:
                        "Best competitor's SERP position for the primary keyword.",
                },
            },
            {
                name: 'keywords',
                type: 'array',
                admin: {
                    description: 'The cluster keywords and their metrics.',
                },
                fields: [
                    { name: 'keyword', type: 'text' },
                    { name: 'searchVolume', type: 'number' },
                    { name: 'difficulty', type: 'number' },
                    { name: 'intent', type: 'text' },
                    { name: 'competitorRank', type: 'number' },
                ],
            },
            {
                name: 'brief',
                type: 'json',
                admin: {
                    description:
                        'The generated article brief (title, angle, outline, keywords).',
                },
            },
            {
                name: 'post',
                type: 'relationship',
                relationTo: articleCollection,
                admin: {
                    description:
                        'The draft article page created from this topic, once generated.',
                },
            },
        ],
    };
}
