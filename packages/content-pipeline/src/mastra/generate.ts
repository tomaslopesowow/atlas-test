import type { KeywordCluster } from '../pipeline/clustering';
import type { SeoAgents } from './agents/seo-writer';
import {
    clampMeta,
    stripBareDomainLinks,
    stripToFirstHeading,
} from './article-format';
import {
    type ArticleBrief,
    BriefSchema,
    languageName,
    META_LIMITS,
    MetaSchema,
} from './schemas';

/**
 * A body shorter than this almost certainly means generation failed (an empty
 * completion, a refusal, or steps exhausted on tool calls) rather than a real
 * short article — reject it instead of publishing a near-empty post.
 */
const MIN_ARTICLE_CHARS = 400;

/** A fully generated article for one locale, ready for `createArticlePage`. */
export type GeneratedArticle = {
    title: string;
    excerpt: string;
    bodyMarkdown: string;
    metaTitle: string;
    metaDescription: string;
    /** 3–5 Q&A pairs for the on-page FAQ + FAQPage rich result. */
    faq: { q: string; a: string }[];
};

/**
 * Per-client editorial context, sourced from the settings global. Woven into
 * the brief + article prompts so the writing reads like a practitioner in the
 * client's field rather than a generic SEO bot. Every field is optional; the
 * prompts fall back to inferring from the keywords when one is empty.
 */
export type BusinessContext = {
    businessContext?: string;
    industry?: string;
    audience?: string;
    experienceDomains?: string;
};

/** Renders the shared `<business_context>` prompt block (with fallbacks). */
function businessContextBlock(ctx: BusinessContext): string {
    return `<business_context>
Industry: ${ctx.industry || '(not specified — infer from the keywords and brief)'}
Audience: ${ctx.audience || 'practitioners searching for this topic'}
About the business: ${ctx.businessContext || '(not specified)'}
</business_context>`;
}

/**
 * Turns a keyword cluster into a writing brief via the strategist agent
 * (structured output). Replaces the former one-shot `generateObject` call —
 * same shape, now routed through a Mastra agent so it shares the agent's
 * model config, tools and observability.
 */
export async function generateBrief(
    agents: SeoAgents,
    cluster: KeywordCluster,
    options: BusinessContext & {
        brandVoice: string;
        languageCode: string;
        peopleAlsoAskQuestions?: string[];
    },
): Promise<ArticleBrief> {
    const keywords = cluster.keywords.slice(0, 15).map((k) => k.keyword);
    const peopleAlsoAskQuestions = options.peopleAlsoAskQuestions ?? [];

    const questionsBlock = peopleAlsoAskQuestions.length
        ? `\n\nReal Google "People also ask" questions for the primary keyword:\n${peopleAlsoAskQuestions
              .map((question) => `- ${question}`)
              .join(
                  '\n',
              )}\nShape the outline so the article naturally answers the ones that fit the angle.`
        : '';

    const { object } = await agents.seoStrategistAgent.generate(
        `Produce a brief for an article that targets this cluster of related keywords, written in language "${options.languageCode}".

${businessContextBlock(options)}

Primary keyword: "${cluster.primary.keyword}"
Related keywords: ${keywords.join(', ')}

Brand voice: ${options.brandVoice || '(neutral, expert, helpful)'}${questionsBlock}

The article should serve the dominant search intent and have the best chance of ranking. Return a title, a one-sentence angle, a short rationale (why this topic and angle — which keyword/intent signals it targets and why it can rank), and an ordered outline of H2 sections.`,
        { structuredOutput: { schema: BriefSchema } },
    );

    return {
        title: object.title,
        angle: object.angle,
        rationale: object.rationale,
        outline: object.outline,
        primaryKeyword: cluster.primary.keyword,
        secondaryKeywords: keywords.filter(
            (keyword) => keyword !== cluster.primary.keyword,
        ),
        ...(peopleAlsoAskQuestions.length ? { peopleAlsoAskQuestions } : {}),
    };
}

/**
 * Generates a full article from a brief, in a single locale, as clean Markdown
 * ready for `markdownToLexicalBody`.
 *
 * The body is written by the {@link seoWriterAgent} (strong model + the
 * internal-links tool, so it can add real internal links); the title/excerpt/
 * meta bundle comes from the strategist agent as structured output.
 */
export async function generateArticle(
    agents: SeoAgents,
    brief: ArticleBrief,
    options: BusinessContext & {
        brandVoice: string;
        languageCode: string;
        peopleAlsoAskQuestions?: string[];
    },
): Promise<GeneratedArticle> {
    const voice = options.brandVoice || 'Neutral, expert, helpful. No fluff.';
    const language = languageName(options.languageCode);
    const peopleAlsoAskQuestions = options.peopleAlsoAskQuestions ?? [];
    const experience =
        options.experienceDomains || "the article's subject area";

    const body = await agents.seoWriterAgent.generate(
        `${businessContextBlock(options)}

<article_brief>
Language: ${language}
Working title: ${brief.title}
Angle: ${brief.angle}
Primary keyword: ${brief.primaryKeyword}
Secondary keywords: ${brief.secondaryKeywords.join(', ')}
Suggested outline (adapt as needed):
${brief.outline.map((heading) => `- ${heading}`).join('\n')}
Brand voice: ${voice}
</article_brief>

Write the full article from this brief.

<requirements>
- Language: write every heading and sentence in ${language}. The brief may be in another language; translate its intent and produce the article in ${language} regardless.
- Length: 1,500 to 2,500 words. Every paragraph adds information. Cut padding and restated headings.
- Keyword: use the exact phrase "${brief.primaryKeyword}" verbatim at least twice, once early (intro or first H2) and once in a heading where it reads naturally. Work in the secondary keywords (${brief.secondaryKeywords.join(', ') || 'none'}) where they fit. Never stuff.
- Answer first (GEO): the first paragraph under the first "## " heading must directly answer the search query behind "${brief.primaryKeyword}" in 40 to 60 words, self-contained enough to be quoted on its own. The body starts with that heading and that paragraph; no warm-up section before the answer.
- Statistics (GEO): weave at least 3 distinct, specific statistics (percentages, counts, ranges, amounts) into the body, each attributed to a named source. Only use figures you are confident are real; when you cannot name a credible source for a number, make the claim without one rather than inventing it.
- First-hand experience (E-E-A-T): include at least one concrete worked example from ${experience} — a specific workflow, a concrete failure mode, or a step-by-step task. Use specific numbers or ranges for any quantitative claim.
- Sources: cite at least one authoritative external source as a descriptive Markdown link where it genuinely supports a claim. Link the specific page or report, never a domain homepage; name the publisher in the sentence. If you are not confident of the exact URL, name the source without a link; never invent a URL.
- Internal links: call the internal-links tool once (locale "${options.languageCode}") to find related published pages. For each genuinely relevant result, add a descriptive Markdown link to its returned relative URL. If it returns nothing, continue without.${
            peopleAlsoAskQuestions.length
                ? `\n- Reader questions: these are real Google "People also ask" questions for the primary keyword. Cover the ones that fit the angle, in the body where they belong naturally:\n${peopleAlsoAskQuestions
                      .map((question) => `  - ${question}`)
                      .join('\n')}`
                : ''
        }
- Close with a short section that restates the reader's core problem and the outcome of solving it. No sales pitch, no "book a demo", no call to action; the page adds its own.
- Apply the <sound_human> rules from your instructions throughout, in every section. Varied sentence length especially. That is what keeps a 2,000-word article from reading like it was generated.
</requirements>`,
        { maxSteps: 4, modelSettings: { maxOutputTokens: 8000 } },
    );

    // Strip any agent preamble before the first H2 (e.g. tool-use narration like
    // "I'll search for internal links…") so it never leaks into the post body,
    // then unlink any bare-domain citations that slipped past the prompt rules.
    const bodyMarkdown = stripBareDomainLinks(
        stripToFirstHeading(body.text?.trim() ?? ''),
    );
    if (bodyMarkdown.length < MIN_ARTICLE_CHARS) {
        throw new Error(
            `Generated article body too short (${bodyMarkdown.length} chars) for "${brief.title}" in ${language}.`,
        );
    }

    const questionsFaqBlock = peopleAlsoAskQuestions.length
        ? `\n\nThese are real Google "People also ask" questions for the primary keyword:\n${peopleAlsoAskQuestions
              .map((question) => `- ${question}`)
              .join(
                  '\n',
              )}\nPrefer phrasing the FAQ questions as these real questions where the article genuinely answers them; skip any the article does not answer.`
        : '';

    const { object: meta } = await agents.seoStrategistAgent.generate(
        `For an article titled "${brief.title}" (primary keyword "${brief.primaryKeyword}", angle: ${brief.angle}), with this brand voice: ${voice}

Here is the article body the FAQ must reflect:
"""
${bodyMarkdown}
"""${questionsFaqBlock}

Produce a localized title, a standfirst excerpt, an SEO meta description, and 3–5 FAQ question/answer pairs that the article genuinely answers — all written entirely in ${language}.`,
        { structuredOutput: { schema: MetaSchema } },
    );

    const title = clampMeta(meta.title, META_LIMITS.title);
    return {
        title,
        excerpt: clampMeta(meta.excerpt, META_LIMITS.excerpt),
        bodyMarkdown,
        metaTitle: title,
        metaDescription: clampMeta(
            meta.metaDescription,
            META_LIMITS.metaDescription,
        ),
        faq: meta.faq.map((item) => ({ q: item.q.trim(), a: item.a.trim() })),
    };
}
