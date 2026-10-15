'use client';

import { Gutter, useFormFields } from '@payloadcms/ui';
import type { GenerationReasoning } from '@repo/content-pipeline/mastra/schemas';

/**
 * Read-only "why this article was generated" panel on pipeline-generated posts.
 * Renders the frozen reasoning snapshot persisted on `posts.aiReasoning` — why
 * this topic surfaced (keyword/competitor/score signals) and why it was written
 * this way (the brief's angle + rationale), plus the quality-gate result — so a
 * reviewing editor has the full context before publishing. Reads from form
 * state, not the source topic, so it works even if the topic was deleted.
 *
 * Hidden for hand-written posts via the field's `admin.condition` on
 * `aiGenerated`; renders nothing if the snapshot is somehow absent.
 */
export default function PostAiRationale() {
    const reasoning = useFormFields(
        ([fields]) =>
            fields?.aiReasoning?.value as GenerationReasoning | undefined,
    );

    if (!reasoning) return null;

    const {
        source,
        runWeek,
        opportunityScore,
        primaryKeyword,
        primaryKeywordVolume,
        primaryKeywordDifficulty,
        primaryKeywordIntent,
        competitor,
        topKeywords,
        angle,
        rationale,
        quality,
        category,
    } = reasoning;

    return (
        <Gutter left right>
            <div
                style={{
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: 'var(--style-radius-m, 6px)',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    background: 'var(--theme-elevation-50)',
                }}
            >
                <h4 style={{ margin: '0 0 0.75rem' }}>
                    Why this article was generated
                </h4>

                <p style={{ margin: '0 0 1rem', lineHeight: 1.5 }}>
                    {rationale}
                </p>

                <Row label="Source">
                    {source === 'competitor'
                        ? 'Competitor-gap research'
                        : 'Seed keyword research'}
                    {runWeek ? ` · ${runWeek}` : ''}
                </Row>

                {category ? (
                    <Row label="Category">
                        <strong>{category.name}</strong>
                        {category.reason ? ` — ${category.reason}` : ''}
                    </Row>
                ) : null}

                <Row label="Primary keyword">
                    <strong>{primaryKeyword}</strong>
                    {formatKeywordMetrics(
                        primaryKeywordVolume,
                        primaryKeywordDifficulty,
                        primaryKeywordIntent,
                    )}
                </Row>

                {competitor?.domain ? (
                    <Row label="Competitor">
                        {competitor.domain}
                        {typeof competitor.rank === 'number'
                            ? ` (ranks #${competitor.rank})`
                            : ''}
                    </Row>
                ) : null}

                {typeof opportunityScore === 'number' ? (
                    <Row label="Opportunity score">
                        {Math.round(opportunityScore)}
                    </Row>
                ) : null}

                {angle ? <Row label="Angle">{angle}</Row> : null}

                {topKeywords?.length ? (
                    <Row label="Cluster keywords">
                        {topKeywords
                            .map((k) => k.keyword)
                            .filter(Boolean)
                            .join(', ')}
                    </Row>
                ) : null}

                {quality ? (
                    <Row label="Quality">
                        {quality.score}/100
                        {quality.flags?.length
                            ? ` — ${quality.flags.join(' ')}`
                            : ' — no flags'}
                    </Row>
                ) : null}
            </div>
        </Gutter>
    );
}

function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.25rem 0',
                fontSize: '0.85rem',
            }}
        >
            <span
                style={{
                    minWidth: '9rem',
                    color: 'var(--theme-elevation-500)',
                }}
            >
                {label}
            </span>
            <span>{children}</span>
        </div>
    );
}

function formatKeywordMetrics(
    volume?: number,
    difficulty?: number,
    intent?: string,
): string {
    const parts: string[] = [];
    if (typeof volume === 'number') parts.push(`${volume}/mo`);
    if (typeof difficulty === 'number') parts.push(`difficulty ${difficulty}`);
    if (intent) parts.push(intent);
    return parts.length ? ` — ${parts.join(', ')}` : '';
}
