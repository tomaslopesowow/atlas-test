import type { CompetitorMeta } from '@repo/content-pipeline/dataforseo/ranked-keywords';
import type { ContentPipelineEngine } from '@repo/content-pipeline/engine';
import {
    hasHardFlag,
    isStructurallyTooShort,
    MIN_DRAFT_SCORE,
    scoreArticleQuality,
} from '@repo/content-pipeline/mastra/evals/article-scorers';
import type {
    BusinessContext,
    GeneratedArticle,
} from '@repo/content-pipeline/mastra/generate';
import type {
    ArticleBrief,
    GenerationReasoning,
} from '@repo/content-pipeline/mastra/schemas';
import { clusterKeywords } from '@repo/content-pipeline/pipeline/clustering';
import type { DedupSensitivity } from '@repo/content-pipeline/pipeline/dedup-sensitivity';
import { filterBySeedRelevance } from '@repo/content-pipeline/pipeline/relevance';
import {
    type ScoredKeyword,
    scoreCompetitorKeywords,
    scoreKeywords,
} from '@repo/content-pipeline/pipeline/scoring';
import {
    type AppLocale,
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
} from '@repo/i18n/shared';
import type { Payload } from 'payload';
import { createHeroImageForTopic } from '../images';
import type { PipelineSettings } from '../payload/load-settings';
import { classifyTag } from '../pipeline/categorize';
import {
    type CreateArticlePageInput,
    createArticlePage,
    type LocalizedArticle,
} from '../pipeline/create-article-page';
import { filterNewClusters } from '../pipeline/dedup';
import {
    type DedupDecision,
    gateNearDuplicates,
} from '../pipeline/near-duplicate-gate';

/** Pulls the per-client editorial context off the settings global. */
function businessContextOf(settings: PipelineSettings): BusinessContext {
    return {
        businessContext: settings.businessContext,
        industry: settings.industry,
        audience: settings.audience,
        experienceDomains: settings.experienceDomains,
    };
}

/**
 * The pipeline orchestration core: research → score → cluster → dedup → brief →
 * generate → draft post. Replaces the former hand-rolled `pipeline/orchestrator`
 * — the brief and article generation now run through Mastra agents
 * ({@link generateBrief} / {@link generateArticle}), and each generated draft is
 * scored by the deterministic quality gate before the topic is marked done.
 *
 * These functions are shared by the Mastra workflow steps and the local
 * `pipeline:*` verification scripts; the workflow adds suspend/resume approval
 * and observability on top.
 */

export type ResearchParams = BusinessContext & {
    seedTerms: string[];
    locationCode: number;
    languageCode: string;
    minVolume: number;
    maxDifficulty: number;
    brandVoice: string;
    /** Cap how many new topics to brief + persist this run. */
    maxNewTopics: number;
    /** ISO week tag stored on each topic, e.g. "2026-W23". */
    runWeek: string;
    /** How aggressively the near-duplicate gate drops overlapping topics. */
    dedupSensitivity: DedupSensitivity;
};

export type CompetitorResearchParams = ResearchParams & {
    competitorDomains: string[];
    /** Our own domain — keywords we already rank for are excluded (content gap). */
    ownDomain?: string;
    /** Max keywords pulled per competitor domain. */
    limitPerDomain?: number;
};

type PersistOptions = BusinessContext & {
    brandVoice: string;
    languageCode: string;
    /** DataForSEO location code — used for the per-topic PAA SERP lookup. */
    locationCode: number;
    runWeek: string;
    maxNewTopics: number;
    source: 'seed' | 'competitor';
    dedupSensitivity: DedupSensitivity;
    /** Competitor rank/domain per keyword (competitor source only). */
    metaByKeyword?: Map<string, CompetitorMeta>;
};

/**
 * Shared tail: cluster → dedup → brief → persist as `queued` topics. Each topic
 * is briefed inside its own try/catch, so one failure never aborts the run.
 */
async function persistTopicsFromScored(
    payload: Payload,
    engine: ContentPipelineEngine,
    scored: ScoredKeyword[],
    options: PersistOptions,
): Promise<string[]> {
    // Exact-key dedup first (free, backed by the unique index), then the
    // near-duplicate gate to drop semantically overlapping candidates before we
    // spend any brief tokens. Gating before the slice means a dropped near-dup
    // frees its slot for the next genuinely-new cluster, so a run still yields a
    // full `maxNewTopics`.
    const fresh = await filterNewClusters(payload, clusterKeywords(scored));
    const { kept, decisions } = await gateNearDuplicates(
        payload,
        engine,
        fresh,
        {
            sensitivity: options.dedupSensitivity,
            marketLocale: resolveMarketLocale(options.languageCode),
            maxNewTopics: options.maxNewTopics,
        },
    );
    await recordDedupDecisions(payload, decisions, options);

    const dropped = decisions.filter((d) => !d.kept).length;
    if (dropped > 0) {
        payload.logger.info(
            `Content pipeline: near-duplicate gate dropped ${dropped} of ${
                decisions.length
            } ${options.source} candidates (${kept.length} kept).`,
        );
    }

    const selected = kept.slice(0, options.maxNewTopics);
    const decisionByKey = new Map(decisions.map((d) => [d.clusterKey, d]));

    const ids: string[] = [];
    for (const cluster of selected) {
        try {
            // Real "People also ask" questions for the primary keyword — they
            // steer the outline and become the post FAQ. Strictly best-effort:
            // a failed SERP call must never cost the topic.
            let peopleAlsoAskQuestions: string[] = [];
            try {
                ({ questions: peopleAlsoAskQuestions } =
                    await engine.research.peopleAlsoAsk({
                        keyword: cluster.primary.keyword,
                        locationCode: options.locationCode,
                        languageCode: options.languageCode,
                    }));
            } catch (error) {
                payload.logger.warn(
                    `Content pipeline: PAA fetch for "${cluster.primary.keyword}" failed — continuing without: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
            }

            const brief = await engine.generation.generateBrief(cluster, {
                brandVoice: options.brandVoice,
                languageCode: options.languageCode,
                businessContext: options.businessContext,
                industry: options.industry,
                audience: options.audience,
                experienceDomains: options.experienceDomains,
                peopleAlsoAskQuestions,
            });

            const primaryMeta = options.metaByKeyword?.get(
                cluster.primary.keyword,
            );

            // A near-dup the gate kept (under non-strict sensitivity) is flagged
            // on the real topic, rather than as a separate `rejected` audit row
            // — which would collide with this topic's unique clusterKey.
            const decision = decisionByKey.get(cluster.clusterKey);
            const flaggedNearDup =
                decision?.kept === true &&
                decision.verdict === 'near-duplicate';

            const created = await payload.create({
                collection: 'content-pipeline-topics',
                data: {
                    clusterKey: cluster.clusterKey,
                    title: brief.title,
                    status: 'queued',
                    source: options.source,
                    runWeek: options.runWeek,
                    score: Math.round(cluster.score),
                    primaryKeyword: cluster.primary.keyword,
                    competitorDomain: primaryMeta?.domain,
                    competitorRank: primaryMeta?.rank,
                    keywords: cluster.keywords.slice(0, 25).map((k) => ({
                        keyword: k.keyword,
                        searchVolume: k.searchVolume,
                        difficulty: k.difficulty ?? undefined,
                        intent: k.intent ?? undefined,
                        competitorRank: options.metaByKeyword?.get(k.keyword)
                            ?.rank,
                    })),
                    brief,
                    dedupReason: flaggedNearDup
                        ? (decision.reason ?? decision.verdict)
                        : undefined,
                    duplicateOf: flaggedNearDup
                        ? decision.matchedRef
                        : undefined,
                },
            });
            ids.push(String(created.id));
        } catch (error) {
            payload.logger.error(
                `Content pipeline: briefing "${cluster.clusterKey}" failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    // Distinguish "nothing new to brief" from "every brief failed" — the latter
    // would otherwise look like a clean run that simply found nothing.
    if (selected.length > 0 && ids.length === 0) {
        payload.logger.error(
            `Content pipeline: all ${selected.length} candidate ${options.source} topics failed to brief — no topics persisted.`,
        );
    }

    return ids;
}

/**
 * The market locale is the language the keyword research + brief are in. It's
 * only a real app locale when `searchLanguageCode` is one of our configured
 * locales; otherwise there's no localized content to compare/score against.
 */
export function resolveMarketLocale(
    searchLanguageCode: string,
): AppLocale | undefined {
    return (I18N_LOCALES as readonly string[]).includes(searchLanguageCode)
        ? (searchLanguageCode as AppLocale)
        : undefined;
}

/**
 * Records the near-duplicate gate's drops as `rejected` audit topics, so a
 * skipped candidate is visible in the admin with the reason and what it matched.
 * (Kept-but-flagged near-dups are annotated on the real topic instead — see the
 * create loop above — so they don't need an audit row.)
 *
 * The audit row's `clusterKey` is namespaced (`dedup:<key>`) so it never
 * collides with a real topic's unique `clusterKey`, and so a dropped candidate
 * is not treated as permanently handled by `filterNewClusters` — drops stay
 * re-evaluable on later runs (e.g. after relaxing sensitivity). Each create is
 * isolated: a collision (this drop was already audited) just logs.
 */
async function recordDedupDecisions(
    payload: Payload,
    decisions: DedupDecision[],
    options: PersistOptions,
): Promise<void> {
    const auditable = decisions.filter((d) => !d.kept);

    for (const decision of auditable) {
        try {
            await payload.create({
                collection: 'content-pipeline-topics',
                data: {
                    clusterKey: `dedup:${decision.clusterKey}`,
                    title: decision.primaryKeyword,
                    status: 'rejected',
                    source: options.source,
                    runWeek: options.runWeek,
                    primaryKeyword: decision.primaryKeyword,
                    dedupReason: decision.reason ?? decision.verdict,
                    duplicateOf: decision.matchedRef,
                },
            });
        } catch (error) {
            payload.logger.warn(
                `Content pipeline: recording dedup decision for "${decision.clusterKey}" failed (likely already tracked): ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }
}

/**
 * Seed research: fetch keyword ideas for the seeds → relevance guard → score →
 * persist as `queued` topics. Returns the created topic ids.
 */
export async function researchAndPersistTopics(
    payload: Payload,
    engine: ContentPipelineEngine,
    params: ResearchParams,
): Promise<string[]> {
    if (params.seedTerms.length === 0) return [];

    const { keywords } = await engine.research.keywordResearch({
        keywords: params.seedTerms,
        locationCode: params.locationCode,
        languageCode: params.languageCode,
        limit: 200,
    });

    const relevant = filterBySeedRelevance(keywords, params.seedTerms);
    const scored = scoreKeywords(relevant, {
        minVolume: params.minVolume,
        maxDifficulty: params.maxDifficulty,
    });

    return persistTopicsFromScored(payload, engine, scored, {
        brandVoice: params.brandVoice,
        businessContext: params.businessContext,
        industry: params.industry,
        audience: params.audience,
        experienceDomains: params.experienceDomains,
        languageCode: params.languageCode,
        locationCode: params.locationCode,
        runWeek: params.runWeek,
        maxNewTopics: params.maxNewTopics,
        source: 'seed',
        dedupSensitivity: params.dedupSensitivity,
    });
}

/**
 * Competitor-gap research: the low-difficulty keywords competitors rank for that
 * we don't already rank for, scored by outrankability → persist as `queued`
 * topics tagged `source: 'competitor'`. Returns the created topic ids.
 */
export async function researchCompetitorsAndPersistTopics(
    payload: Payload,
    engine: ContentPipelineEngine,
    params: CompetitorResearchParams,
): Promise<string[]> {
    if (params.competitorDomains.length === 0) return [];

    const { keywords, metaByKeyword } = await engine.research.competitorGap({
        competitorDomains: params.competitorDomains,
        ownDomain: params.ownDomain,
        locationCode: params.locationCode,
        languageCode: params.languageCode,
        minVolume: params.minVolume,
        maxDifficulty: params.maxDifficulty,
        limitPerDomain: params.limitPerDomain,
        onError: (domain, message) =>
            payload.logger.warn(
                `Content pipeline: competitor "${domain}" failed: ${message}`,
            ),
    });

    // Keep competitor keywords on-brand when seeds are configured (no-op otherwise).
    const relevant = filterBySeedRelevance(keywords, params.seedTerms);
    const rankByKeyword = new Map(
        Array.from(metaByKeyword, ([keyword, meta]) => [keyword, meta.rank]),
    );
    const scored = scoreCompetitorKeywords(
        relevant,
        { minVolume: params.minVolume, maxDifficulty: params.maxDifficulty },
        rankByKeyword,
    );

    return persistTopicsFromScored(payload, engine, scored, {
        brandVoice: params.brandVoice,
        businessContext: params.businessContext,
        industry: params.industry,
        audience: params.audience,
        experienceDomains: params.experienceDomains,
        languageCode: params.languageCode,
        locationCode: params.locationCode,
        runWeek: params.runWeek,
        maxNewTopics: params.maxNewTopics,
        source: 'competitor',
        dedupSensitivity: params.dedupSensitivity,
        metaByKeyword,
    });
}

/** Outcome counts for a draft pass, surfaced so an empty run isn't silent. */
export type DraftSummary = {
    postIds: string[];
    /** Topics rejected by the quality gate or a generation failure. */
    rejectedTopicIds: string[];
};

/**
 * Whether the site has any published page the internal-links tool could link
 * to. Mirrors that tool's surface (published `pages`), so the quality gate only
 * expects internal links when a real link target exists — a brand-new site with
 * no published pages yet shouldn't be marked down for not linking to pages that
 * don't exist.
 */
async function hasLinkableContent(payload: Payload): Promise<boolean> {
    const { totalDocs } = await payload.count({
        collection: 'pages',
        where: { _status: { equals: 'published' } },
    });
    return totalDocs > 0;
}

/**
 * Builds the frozen "why this article" snapshot persisted on the post. Composed
 * entirely from data already on the topic + brief + quality result, so it costs
 * nothing extra and survives the topic being deleted later.
 */
function buildGenerationReasoning(
    topic: { [key: string]: unknown },
    brief: ArticleBrief,
    quality: { score: number; flags: string[] },
    category?: { name: string; reason: string; confidence: number },
): GenerationReasoning {
    const keywords = Array.isArray(topic.keywords)
        ? (topic.keywords as Array<{
              keyword?: string | null;
              searchVolume?: number | null;
              difficulty?: number | null;
              intent?: string | null;
          }>)
        : [];
    const primary = keywords.find((k) => k.keyword === brief.primaryKeyword);
    const source = topic.source === 'competitor' ? 'competitor' : 'seed';

    return {
        source,
        runWeek: String(topic.runWeek ?? ''),
        opportunityScore: typeof topic.score === 'number' ? topic.score : 0,
        primaryKeyword: brief.primaryKeyword,
        primaryKeywordVolume: primary?.searchVolume ?? undefined,
        primaryKeywordDifficulty: primary?.difficulty ?? undefined,
        primaryKeywordIntent: primary?.intent ?? undefined,
        competitor:
            source === 'competitor'
                ? {
                      domain:
                          typeof topic.competitorDomain === 'string'
                              ? topic.competitorDomain
                              : undefined,
                      rank:
                          typeof topic.competitorRank === 'number'
                              ? topic.competitorRank
                              : undefined,
                  }
                : undefined,
        topKeywords: keywords.slice(0, 5).map((k) => ({
            keyword: String(k.keyword ?? ''),
            searchVolume: k.searchVolume ?? undefined,
            difficulty: k.difficulty ?? undefined,
        })),
        angle: brief.angle,
        rationale: brief.rationale,
        quality,
        ...(category ? { category } : {}),
    };
}

/**
 * Generate the article for a queued topic (one per target locale), apply the
 * quality gate, and — if it passes — create a draft post. The topic is marked
 * `generating` while in flight, then `drafted` (with the new post linked, a
 * quality score, flags, and the generation reasoning recorded) or `rejected`
 * when the gate fails. The default locale is always generated so the post is
 * valid even if it is omitted from settings.
 *
 * Returns the created post id, or `null` when the draft was gated out (a normal
 * outcome, not an error — the topic is left `rejected`).
 */
export async function generateDraftForTopic(
    payload: Payload,
    engine: ContentPipelineEngine,
    topicId: string,
    settings: PipelineSettings,
): Promise<string | null> {
    const topic = await payload.findByID({
        collection: 'content-pipeline-topics',
        id: topicId,
        depth: 0,
    });

    const brief = topic.brief as ArticleBrief | null;
    if (!brief) {
        throw new Error(`Topic ${topicId} has no brief to generate from.`);
    }

    await payload.update({
        collection: 'content-pipeline-topics',
        id: topicId,
        data: { status: 'generating' },
    });

    // Generate the MARKET-language body first and gate it before spending tokens
    // on any other locale. Keyword coverage in the quality gate is a literal
    // substring check, so the market locale (the language the keyword + brief
    // are in) is the one that must pass — generating en + other locales for a
    // draft that's about to be rejected is pure waste.
    const marketLocale = resolveMarketLocale(settings.searchLanguageCode);
    const scoringLocale = marketLocale ?? I18N_DEFAULT_LOCALE;

    // Don't penalise missing internal links when there's nothing to link to yet.
    const expectInternalLinks = await hasLinkableContent(payload);

    const toLocalized = (article: GeneratedArticle): LocalizedArticle => ({
        title: article.title,
        excerpt: article.excerpt,
        bodyMarkdown: article.bodyMarkdown,
        meta: {
            title: article.metaTitle,
            description: article.metaDescription,
        },
        faq: article.faq,
    });

    const scoredArticle = await engine.generation.generateArticle(brief, {
        brandVoice: settings.brandVoice,
        languageCode: scoringLocale,
        ...businessContextOf(settings),
        // PAA questions are in the market language; other locales would echo
        // them in the wrong language, so only the market article gets them.
        peopleAlsoAskQuestions: brief.peopleAlsoAskQuestions,
    });

    // Full quality gate on the market-language body. Below the hard floor (or a
    // disqualifying flag) → rejected outright, before any other locale is
    // generated. Soft flags above the floor are recorded for the editor.
    const quality = scoreArticleQuality(scoredArticle.bodyMarkdown, brief, {
        expectInternalLinks,
    });

    if (quality.score < MIN_DRAFT_SCORE || hasHardFlag(quality)) {
        await payload.update({
            collection: 'content-pipeline-topics',
            id: topicId,
            data: {
                status: 'rejected',
                qualityScore: quality.score,
                qualityFlags: quality.flags,
            },
        });
        payload.logger.warn(
            `Content pipeline: topic ${topicId} rejected by quality gate (${quality.score}/100) — ${quality.flags.join(' ')}`,
        );
        return null;
    }

    if (quality.flags.length) {
        payload.logger.warn(
            `Content pipeline: topic ${topicId} quality ${quality.score}/100 — ${quality.flags.join(' ')}`,
        );
    }

    const content: Partial<Record<AppLocale, LocalizedArticle>> = {
        [scoringLocale]: toLocalized(scoredArticle),
    };

    // The market body passed — now generate the remaining locales (the default
    // locale, if different, plus any other targets). Independent LLM calls, so
    // settle each: a single locale failing must not throw away the winners.
    const otherLocales = Array.from(
        new Set<AppLocale>([I18N_DEFAULT_LOCALE, ...settings.targetLocales]),
    ).filter((locale) => locale !== scoringLocale);

    const settled = await Promise.allSettled(
        otherLocales.map(async (locale) => {
            const article = await engine.generation.generateArticle(brief, {
                brandVoice: settings.brandVoice,
                languageCode: locale,
                ...businessContextOf(settings),
            });
            return [locale, article] as const;
        }),
    );

    settled.forEach((result, i) => {
        if (result.status === 'rejected') {
            const reason =
                result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason);
            payload.logger.warn(
                `Content pipeline: topic ${topicId} locale "${otherLocales[i]}" generation failed: ${reason}`,
            );
            return;
        }
        const [locale, article] = result.value;
        content[locale] = toLocalized(article);
    });

    // Structural floor (language-agnostic word count) on the other locales — the
    // market locale already passed the full gate above. A too-short or absent
    // OPTIONAL locale is dropped (the post falls back to the default at read
    // time); a too-short or absent DEFAULT locale rejects the post, since it
    // backs the canonical doc and can't be quietly dropped.
    for (const locale of otherLocales) {
        const localeArticle = content[locale];

        if (localeArticle) {
            const structural = scoreArticleQuality(
                localeArticle.bodyMarkdown,
                brief,
                { expectInternalLinks },
            );
            if (!isStructurallyTooShort(structural)) continue;

            if (locale !== I18N_DEFAULT_LOCALE) {
                payload.logger.warn(
                    `Content pipeline: topic ${topicId} dropped locale "${locale}" — body too short (${structural.wordCount} words); falls back to ${I18N_DEFAULT_LOCALE}.`,
                );
                content[locale] = undefined;
                continue;
            }

            await payload.update({
                collection: 'content-pipeline-topics',
                id: topicId,
                data: {
                    status: 'rejected',
                    qualityScore: structural.score,
                    qualityFlags: structural.flags,
                },
            });
            payload.logger.warn(
                `Content pipeline: topic ${topicId} rejected — default locale (${locale}) body too short (${structural.wordCount} words).`,
            );
            return null;
        }

        // Locale produced nothing (generation failed). The default locale is
        // required to create the post; other locales just fall back to it.
        if (locale === I18N_DEFAULT_LOCALE) {
            await payload.update({
                collection: 'content-pipeline-topics',
                id: topicId,
                data: {
                    status: 'rejected',
                    qualityScore: quality.score,
                    qualityFlags: quality.flags,
                },
            });
            payload.logger.warn(
                `Content pipeline: topic ${topicId} rejected — produced no article in the default locale (${I18N_DEFAULT_LOCALE}).`,
            );
            return null;
        }
    }

    // Pick the best-fit tag by search intent (when tags exist). Optional — on
    // any error or abstention the page is created untagged. Never fail a draft.
    const tagIds: string[] = [];
    let tagChoice: Awaited<ReturnType<typeof classifyTag>> = null;
    try {
        tagChoice = await classifyTag(
            payload,
            engine,
            {
                title: brief.title,
                angle: brief.angle,
                primaryKeyword: brief.primaryKeyword,
                secondaryKeywords: brief.secondaryKeywords,
            },
            { marketLocale },
        );
        if (tagChoice) {
            tagIds.push(tagChoice.tagId);
            payload.logger.info(
                `Content pipeline: topic ${topicId} tagged → "${tagChoice.name}" @${tagChoice.confidence} — ${tagChoice.reason}`,
            );
        }
    } catch (error) {
        payload.logger.warn(
            `Content pipeline: tag classification failed for topic ${topicId} (${
                error instanceof Error ? error.message : String(error)
            }) — leaving untagged.`,
        );
    }

    const reasoning = buildGenerationReasoning(
        topic as unknown as Record<string, unknown>,
        brief,
        quality,
        tagChoice
            ? {
                  name: tagChoice.name,
                  reason: tagChoice.reason,
                  confidence: tagChoice.confidence,
              }
            : undefined,
    );

    // Optional branded cover illustration. Never blocks a draft — on any
    // failure (or when disabled) the post is created image-less, falling back
    // to the site-wide OG image, exactly as before.
    let coverImageId: string | undefined;
    if (settings.enableImageGeneration) {
        const titlesByLocale = Object.fromEntries(
            Object.entries(content).map(([locale, article]) => [
                locale,
                article?.title,
            ]),
        );
        coverImageId =
            (await createHeroImageForTopic(
                payload,
                engine,
                brief,
                settings,
                titlesByLocale,
            )) ?? undefined;
    }

    // Always a draft — a human publishes via the page's normal publish button.
    const postId = await createArticlePage(payload, {
        taxonomyType: settings.taxonomyType,
        authorId: settings.authorId,
        tagIds,
        content: content as CreateArticlePageInput['content'],
        aiGeneration: { reasoning, topicId },
        coverImageId,
    });

    await payload.update({
        collection: 'content-pipeline-topics',
        id: topicId,
        data: {
            status: 'drafted',
            post: postId,
            qualityScore: quality.score,
            qualityFlags: quality.flags,
        },
    });

    return postId;
}

/**
 * Drafts a list of queued topics, isolating each in its own try/catch. A topic
 * that throws during generation is marked `rejected`; a topic gated out by the
 * quality check is already `rejected` by {@link generateDraftForTopic}. Returns
 * the created post ids plus the rejected topic ids, so the caller can report a
 * truthful summary instead of an empty-but-"successful" run.
 *
 * Sweeps topics stranded in `generating` by a dead prior run first — this is the
 * single chokepoint every drafting path goes through, and the sweep runs before
 * any topic in this batch is marked `generating`, so it only ever recovers stale
 * topics, never the current run's.
 */
export async function draftTopics(
    payload: Payload,
    engine: ContentPipelineEngine,
    topicIds: string[],
    settings: PipelineSettings,
): Promise<DraftSummary> {
    await sweepStuckTopics(payload);

    const postIds: string[] = [];
    const rejectedTopicIds: string[] = [];
    for (const topicId of topicIds) {
        try {
            const postId = await generateDraftForTopic(
                payload,
                engine,
                topicId,
                settings,
            );
            if (postId) postIds.push(postId);
            else rejectedTopicIds.push(topicId);
        } catch (error) {
            rejectedTopicIds.push(topicId);
            await payload
                .update({
                    collection: 'content-pipeline-topics',
                    id: topicId,
                    data: { status: 'rejected' },
                })
                .catch(() => {});
            payload.logger.error(
                `Content pipeline: drafting topic ${topicId} failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }
    return { postIds, rejectedTopicIds };
}

/**
 * The full weekly seed run: research new topics, then draft up to `postsPerWeek`
 * of them. Used by the local script; the production path runs this as a Mastra
 * workflow (with optional human approval) via the Payload job.
 */
export async function runWeekly(
    payload: Payload,
    engine: ContentPipelineEngine,
    settings: PipelineSettings,
    runWeek: string,
): Promise<{ topicIds: string[] } & DraftSummary> {
    const topicIds = await researchAndPersistTopics(payload, engine, {
        seedTerms: settings.seedTerms,
        locationCode: settings.searchLocationCode,
        languageCode: settings.searchLanguageCode,
        minVolume: settings.minVolume,
        maxDifficulty: settings.maxDifficulty,
        brandVoice: settings.brandVoice,
        ...businessContextOf(settings),
        maxNewTopics: settings.postsPerWeek,
        runWeek,
        dedupSensitivity: settings.dedupSensitivity,
    });

    const summary = await draftTopics(payload, engine, topicIds, settings);
    return { topicIds, ...summary };
}

/**
 * The competitor-gap run: research competitor content gaps, then draft up to
 * `postsPerWeek` of the resulting topics.
 */
export async function runCompetitorGap(
    payload: Payload,
    engine: ContentPipelineEngine,
    settings: PipelineSettings,
    runWeek: string,
): Promise<{ topicIds: string[] } & DraftSummary> {
    const topicIds = await researchCompetitorsAndPersistTopics(
        payload,
        engine,
        {
            competitorDomains: settings.competitorDomains,
            ownDomain: settings.ownDomain,
            seedTerms: settings.seedTerms,
            locationCode: settings.searchLocationCode,
            languageCode: settings.searchLanguageCode,
            minVolume: settings.minVolume,
            maxDifficulty: settings.maxDifficulty,
            brandVoice: settings.brandVoice,
            ...businessContextOf(settings),
            maxNewTopics: settings.postsPerWeek,
            runWeek,
            dedupSensitivity: settings.dedupSensitivity,
        },
    );

    const summary = await draftTopics(payload, engine, topicIds, settings);
    return { topicIds, ...summary };
}

/**
 * Research-only entry point: persists `queued` topics for the given source and
 * returns their ids, without drafting. The Mastra workflow uses this so a human
 * approval step can sit between research and article generation.
 */
export function researchTopics(
    payload: Payload,
    engine: ContentPipelineEngine,
    settings: PipelineSettings,
    source: 'seed' | 'competitor',
    runWeek: string,
): Promise<string[]> {
    if (source === 'competitor') {
        return researchCompetitorsAndPersistTopics(payload, engine, {
            competitorDomains: settings.competitorDomains,
            ownDomain: settings.ownDomain,
            seedTerms: settings.seedTerms,
            locationCode: settings.searchLocationCode,
            languageCode: settings.searchLanguageCode,
            minVolume: settings.minVolume,
            maxDifficulty: settings.maxDifficulty,
            brandVoice: settings.brandVoice,
            ...businessContextOf(settings),
            maxNewTopics: settings.postsPerWeek,
            runWeek,
            dedupSensitivity: settings.dedupSensitivity,
        });
    }

    return researchAndPersistTopics(payload, engine, {
        seedTerms: settings.seedTerms,
        locationCode: settings.searchLocationCode,
        languageCode: settings.searchLanguageCode,
        minVolume: settings.minVolume,
        maxDifficulty: settings.maxDifficulty,
        brandVoice: settings.brandVoice,
        ...businessContextOf(settings),
        maxNewTopics: settings.postsPerWeek,
        runWeek,
        dedupSensitivity: settings.dedupSensitivity,
    });
}

/**
 * Re-exported from the dependency-free `pipeline/iso-week` leaf module so the
 * HTTP trigger endpoint can import the helper without the Mastra graph. Kept
 * exported here for the existing callers that import it from `pipeline-core`.
 */
export { isoWeek } from '@repo/content-pipeline/pipeline/iso-week';

/**
 * Fails topics left stranded in `generating` past `maxAgeMs` — a run that died
 * mid-draft (a redeploy, a crash) would otherwise leave them stuck forever,
 * blocking nothing but never recovering. Marks each `rejected` with a
 * `stuck-timeout` flag so the editor can see why. Returns how many were swept.
 * Called by {@link draftTopics} before any new drafting begins.
 */
export async function sweepStuckTopics(
    payload: Payload,
    maxAgeMs = 30 * 60_000,
): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const { docs } = await payload.find({
        collection: 'content-pipeline-topics',
        where: {
            and: [
                { status: { equals: 'generating' } },
                { updatedAt: { less_than: cutoff } },
            ],
        },
        limit: 100,
        depth: 0,
    });

    for (const topic of docs) {
        await payload
            .update({
                collection: 'content-pipeline-topics',
                id: topic.id,
                data: {
                    status: 'rejected',
                    qualityFlags: ['stuck-timeout'],
                },
            })
            .catch((error) => {
                payload.logger.error(
                    `Content pipeline: failed to sweep stuck topic ${topic.id}: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
            });
    }

    if (docs.length) {
        payload.logger.warn(
            `Content pipeline: swept ${docs.length} topic(s) stuck in "generating" older than ${Math.round(
                maxAgeMs / 60_000,
            )}m.`,
        );
    }

    return docs.length;
}
