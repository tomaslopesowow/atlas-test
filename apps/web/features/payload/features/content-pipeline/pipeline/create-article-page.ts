import type { GenerationReasoning } from '@repo/content-pipeline/mastra/schemas';
import {
    type AppLocale,
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
} from '@repo/i18n/shared';
import type { Payload } from 'payload';
import type { Page } from '@/payload-types';
import { markdownToLexicalBody } from './markdown-to-lexical';

/** Generated content for a single locale. */
export type LocalizedArticle = {
    title: string;
    excerpt: string;
    /** Body as Markdown (H2/H3 headings, lists, links, quotes — no images). */
    bodyMarkdown: string;
    meta?: {
        title?: string;
        description?: string;
    };
    /** Localized FAQ pairs — appended to the body as a final section. */
    faq?: { q: string; a: string }[];
};

export type CreateArticlePageInput = {
    /** Taxonomy type the generated page is filed under (e.g. "news"). */
    taxonomyType: string;
    /** Optional author (person) document id (taxonomy types that have one). */
    authorId?: string;
    /** Optional tag document ids to assign. */
    tagIds?: string[];
    /**
     * Per-locale content. The default locale is required; other locales are
     * optional and fall back to the default at read time when omitted.
     */
    content: Partial<Record<AppLocale, LocalizedArticle>> &
        Record<typeof I18N_DEFAULT_LOCALE, LocalizedArticle>;
    /** Publish immediately instead of creating a draft. Defaults to draft. */
    publish?: boolean;
    /**
     * When set, marks the page as pipeline-generated and persists the frozen
     * "why this article" reasoning snapshot + a link back to the source topic,
     * surfaced read-only to the reviewing editor.
     */
    aiGeneration?: {
        reasoning: GenerationReasoning;
        topicId?: string;
    };
    /** Optional `media` document id for the cover (also drives the OG image). */
    coverImageId?: string;
};

/** Localized "FAQ" section heading; falls back to "FAQ" for unmapped locales. */
const FAQ_HEADING: Record<string, string> = {
    en: 'FAQ',
    nl: 'Veelgestelde vragen',
};

/** Appends the FAQ as a final "## <heading>" section (### per question). */
function withFaqSection(
    markdown: string,
    faq: LocalizedArticle['faq'],
    locale: string,
): string {
    if (!faq?.length) return markdown;
    const heading = FAQ_HEADING[locale] ?? 'FAQ';
    const body = faq
        .map(({ q, a }) => `### ${q.trim()}\n\n${a.trim()}`)
        .join('\n\n');
    return `${markdown}\n\n## ${heading}\n\n${body}`;
}

/** Builds the single rich-text block holding an article body for one locale. */
function articleBlock(
    payload: Payload,
    article: LocalizedArticle,
    locale: string,
    blockId?: string,
) {
    const markdown = withFaqSection(article.bodyMarkdown, article.faq, locale);
    return {
        ...(blockId ? { id: blockId } : {}),
        blockType: 'rich-text' as const,
        content: markdownToLexicalBody(payload, markdown),
        width: 'large' as const,
        position: 'left' as const,
    };
}

/**
 * Creates a draft article page from generated content: the default-locale
 * document first, then each remaining locale via `payload.update`. The body
 * lives in a single `rich-text` block; because the blocks array is not
 * localized but its `content` richText is, the per-locale update re-sends the
 * same block (matched by its id) carrying that locale's converted body, so the
 * structure is shared and only the content varies per locale.
 *
 * Pages are created as drafts unless `publish` is set — nothing AI-generated
 * goes live without a human publishing it. The `slug`/`path` are left for the
 * collection's hooks to generate per-locale from the title and taxonomy type.
 *
 * Returns the created page's id.
 */
export async function createArticlePage(
    payload: Payload,
    input: CreateArticlePageInput,
): Promise<string> {
    const {
        taxonomyType,
        authorId,
        tagIds,
        content,
        publish = false,
        aiGeneration,
        coverImageId,
    } = input;
    const status = publish ? 'published' : 'draft';
    const defaultContent = content[I18N_DEFAULT_LOCALE];

    const taxonomyData = {
        [taxonomyType]: {
            description: defaultContent.excerpt,
            ...(coverImageId ? { cover: { media: coverImageId } } : {}),
            ...(authorId ? { author: authorId } : {}),
        },
    };

    const created = await payload.create({
        collection: 'pages',
        locale: I18N_DEFAULT_LOCALE,
        data: {
            title: defaultContent.title,
            taxonomyType: taxonomyType as Page['taxonomyType'],
            taxonomyData,
            blocks: [
                articleBlock(payload, defaultContent, I18N_DEFAULT_LOCALE),
            ],
            meta: {
                ...defaultContent.meta,
                ...(coverImageId ? { image: coverImageId } : {}),
            },
            ...(tagIds?.length ? { tags: tagIds } : {}),
            ...(aiGeneration
                ? {
                      aiGenerated: true,
                      aiReasoning: aiGeneration.reasoning,
                      ...(aiGeneration.topicId
                          ? { aiTopic: aiGeneration.topicId }
                          : {}),
                  }
                : {}),
            _status: status,
        },
    });

    const id = String(created.id);

    // The shared block row id — re-sent per locale so the localized `content`
    // attaches to the same block instead of creating new rows.
    const blockId = Array.isArray(created.blocks)
        ? (created.blocks[0] as { id?: string } | undefined)?.id
        : undefined;

    const otherLocales = I18N_LOCALES.filter(
        (locale) => locale !== I18N_DEFAULT_LOCALE,
    );

    for (const locale of otherLocales) {
        const localeContent = content[locale];
        if (!localeContent) continue;

        await payload.update({
            collection: 'pages',
            id,
            locale,
            data: {
                title: localeContent.title,
                taxonomyData: {
                    [taxonomyType]: { description: localeContent.excerpt },
                },
                blocks: [articleBlock(payload, localeContent, locale, blockId)],
                meta: localeContent.meta,
                _status: status,
            },
        });
    }

    return id;
}
