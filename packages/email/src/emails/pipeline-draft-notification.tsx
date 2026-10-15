import { Hr, Link, Section, Text } from 'react-email';
import { MainTemplate } from '@/templates/main.js';

export interface DraftPostSummary {
    /** Default-locale post title. */
    title: string;
    /** Admin edit URL (absolute when the admin base URL is configured). */
    editUrl: string;
    /** Whether the draft has an AI-generated cover image to review. */
    hasImage?: boolean;
}

interface PipelineDraftNotificationEmailProps {
    posts: DraftPostSummary[];
    /** New topics researched this run. */
    researchedCount: number;
    /** Topics rejected by the quality gate or a generation failure. */
    rejectedCount: number;
    /** ISO week tag, e.g. "2026-W23". */
    runWeek: string;
    /** Pipeline source for this run. */
    source: string;
}

export function pipelineDraftNotificationSubject(
    draftCount: number,
    runWeek: string,
): string {
    const noun = draftCount === 1 ? 'draft' : 'drafts';
    return `${draftCount} new blog ${noun} to review — ${runWeek}`;
}

/**
 * Internal notification sent at the end of a content-pipeline run that created
 * at least one draft post, so the team knows there are drafts to review and
 * publish. English-only by design — it's an internal ops email, not a
 * user-facing one.
 */
export function PipelineDraftNotificationEmail({
    posts,
    researchedCount,
    rejectedCount,
    runWeek,
    source,
}: PipelineDraftNotificationEmailProps) {
    const preview = pipelineDraftNotificationSubject(posts.length, runWeek);
    const anyImages = posts.some((post) => post.hasImage);

    return (
        <MainTemplate preview={preview}>
            <Section className="px-10 py-10">
                <Text className="m-0 mb-2 text-2xl font-semibold tracking-tight">
                    New draft posts to review
                </Text>
                <Text className="m-0 mb-6 text-sm leading-relaxed text-gray-600">
                    The content pipeline ({source}) just created {posts.length}{' '}
                    draft {posts.length === 1 ? 'post' : 'posts'} for run{' '}
                    {runWeek}. They stay as drafts until someone reviews and
                    publishes them.
                </Text>

                <Section>
                    {posts.map((post) => (
                        <Section key={post.editUrl} className="mb-3">
                            <Link
                                href={post.editUrl}
                                className="text-base font-medium text-black underline"
                            >
                                {post.title}
                            </Link>
                            {post.hasImage ? (
                                <Text className="m-0 mt-1 text-xs text-gray-500">
                                    🎨 Includes an AI-generated cover image —
                                    review it before publishing.
                                </Text>
                            ) : null}
                        </Section>
                    ))}
                </Section>

                {anyImages ? (
                    <Text className="m-0 mb-2 text-xs leading-relaxed text-gray-500">
                        Cover images are AI-generated illustrations. Check each
                        one fits the article and is on-brand before publishing.
                    </Text>
                ) : null}

                <Hr className="my-6 border-gray-200" />

                <Text className="m-0 text-xs uppercase tracking-wider text-gray-500">
                    This run
                </Text>
                <Text className="m-0 mt-1 text-sm text-gray-900">
                    {researchedCount} topics researched · {posts.length} drafted
                    · {rejectedCount} rejected by the quality gate
                </Text>
            </Section>
        </MainTemplate>
    );
}

export default PipelineDraftNotificationEmail;
