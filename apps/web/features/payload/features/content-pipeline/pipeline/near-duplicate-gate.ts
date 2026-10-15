import type { ContentPipelineEngine } from '@repo/content-pipeline/engine';
import { DedupVerdictSchema } from '@repo/content-pipeline/mastra/schemas';
import type { KeywordCluster } from '@repo/content-pipeline/pipeline/clustering';
import type { DedupSensitivity } from '@repo/content-pipeline/pipeline/dedup-sensitivity';
import {
    AUTO_DUPLICATE_MIN_JACCARD,
    collapseNearDuplicateClusters,
    jaccard,
    SHORTLIST_MIN_JACCARD,
    SHORTLIST_TOP_N,
} from '@repo/content-pipeline/pipeline/similarity';
import { extractMeaningfulTerms } from '@repo/content-pipeline/pipeline/text-utils';
import { type AppLocale, I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { Payload, Where } from 'payload';

/**
 * The near-duplicate gate: a two-tier filter that drops candidate clusters
 * which would produce a blog post duplicating or cannibalising one we already
 * have (an earlier pipeline topic, or any existing blog post — including
 * human-written ones).
 *
 * Tier 1 (free, deterministic): collapse near-identical candidates within this
 * run via lexical {@link jaccard}, and shortlist existing topics/posts that
 * lexically overlap each survivor. Tier 2 (cheap LLM): the {@link dedupJudgeAgent}
 * makes the semantic verdict over that bounded shortlist.
 *
 * Inserted after the exact-key {@link import('./dedup').filterNewClusters} pass
 * (which stays as the zero-cost first filter, backed by the unique index) and
 * before briefing, so we never spend brief/article tokens on a topic we drop.
 */

/** How aggressively the gate drops overlapping candidates — shared leaf type. */
export type { DedupSensitivity };

export type DedupVerdict = 'distinct' | 'near-duplicate' | 'duplicate';

/** The gate's outcome for one candidate cluster — kept for the audit trail. */
export type DedupDecision = {
    clusterKey: string;
    primaryKeyword: string;
    verdict: DedupVerdict;
    /** Whether the cluster survived the gate. */
    kept: boolean;
    /** The closest existing item — `topic:<id>` / `page:<id>`, or a run-mate's key. */
    matchedRef?: string;
    reason?: string;
    confidence?: number;
};

type GateOptions = {
    sensitivity: DedupSensitivity;
    /** Locale to read existing posts in (the market language); falls back to default. */
    marketLocale?: AppLocale;
    /**
     * Stop judging once this many candidates are kept. Clusters arrive sorted
     * best-first, so the kept set is the top survivors; leaving the rest
     * un-judged bounds LLM cost to what the run will actually brief.
     */
    maxNewTopics?: number;
    /** Max shortlist rows handed to the judge. */
    shortlistTopN?: number;
    /** On a judge error, keep the candidate (true, default) or drop it (false). */
    failOpen?: boolean;
};

/** One existing item the candidate is judged against. */
export type ShortlistItem = {
    ref: string;
    kind: 'topic' | 'page';
    status?: string;
    /** Title + supporting text, for both lexical scoring and the judge prompt. */
    text: string;
    /**
     * The item's most keyword-like string (a topic's primary keyword, or a
     * post's title) — compared against the candidate's primary keyword for the
     * deterministic auto-duplicate short-circuit, where the full {@link text}
     * (title + excerpt) would dilute a true phrase match.
     */
    keyphrase: string;
    /** Lexical Jaccard vs the candidate — used to rank/bound the shortlist. */
    score: number;
};

/**
 * Builds the candidate's comparison text: its primary keyword plus its top
 * cluster keywords, so a partial title overlap still scores.
 */
function candidateText(cluster: KeywordCluster): string {
    const keywords = cluster.keywords.slice(0, 8).map((k) => k.keyword);
    return [cluster.primary.keyword, ...keywords].join(' ');
}

/** OR-of-contains over the given fields for each distinctive token. */
function tokenContainsOr(tokens: string[], fields: string[]): Where[] {
    return tokens.flatMap((term) =>
        fields.map((field) => ({ [field]: { contains: term } }) as Where),
    );
}

/**
 * Lexically shortlists existing topics + posts that overlap the candidate.
 * Recall-first: a loose `contains` query bounds the rows, then Jaccard ranks
 * them and we keep the top N above {@link SHORTLIST_MIN_JACCARD}. An empty
 * result (the common case on a small blog) means the judge is skipped entirely.
 */
async function buildDuplicateShortlist(
    payload: Payload,
    cluster: KeywordCluster,
    options: { marketLocale?: AppLocale; topN: number },
): Promise<ShortlistItem[]> {
    const query = candidateText(cluster);
    const tokens = extractMeaningfulTerms(query);
    // No distinctive tokens (e.g. an all-stopword head term) means there's no
    // lexical signal to shortlist on. Skip the queries and let the judge be
    // skipped, rather than running a whole-string `contains` that can't match.
    if (tokens.length === 0) return [];

    // Read posts in the market language AND the default locale: a post that only
    // exists in the default locale (e.g. a human-written English post) has no
    // market-locale title/excerpt for a market-locale query to match, so a
    // single-locale query would miss exactly the cannibalisation we're after.
    const postLocales = Array.from(
        new Set<AppLocale>([
            options.marketLocale ?? I18N_DEFAULT_LOCALE,
            I18N_DEFAULT_LOCALE,
        ]),
    );

    const [topics, postResults] = await Promise.all([
        payload.find({
            collection: 'content-pipeline-topics',
            where: {
                and: [
                    // Exclude the gate's own `rejected` audit rows, so a candidate
                    // is never judged a duplicate of a topic that was never published.
                    { status: { not_equals: 'rejected' } },
                    {
                        or: tokenContainsOr(tokens, [
                            'title',
                            'primaryKeyword',
                        ]),
                    },
                ],
            },
            select: { title: true, primaryKeyword: true, status: true },
            depth: 0,
            limit: 50,
            pagination: false,
        }),
        Promise.all(
            postLocales.map((locale) =>
                payload.find({
                    collection: 'pages',
                    locale,
                    where: {
                        and: [
                            { _status: { in: ['draft', 'published'] } },
                            { or: tokenContainsOr(tokens, ['title']) },
                        ],
                    },
                    select: { title: true },
                    depth: 0,
                    limit: 50,
                    pagination: false,
                }),
            ),
        ),
    ]);

    // Merge per-locale page hits, keeping the first (market-locale-preferred)
    // text for each page id.
    const postsById = new Map<
        string,
        { id: number | string; title?: string | null }
    >();
    for (const result of postResults) {
        for (const doc of result.docs) {
            const id = String(doc.id);
            if (!postsById.has(id)) postsById.set(id, doc);
        }
    }

    const items: ShortlistItem[] = [
        ...topics.docs.map((doc) => {
            const text = [doc.title, doc.primaryKeyword]
                .filter(Boolean)
                .join(' — ');
            return {
                ref: `topic:${doc.id}`,
                kind: 'topic' as const,
                status: typeof doc.status === 'string' ? doc.status : undefined,
                text,
                keyphrase:
                    typeof doc.primaryKeyword === 'string'
                        ? doc.primaryKeyword
                        : (doc.title ?? ''),
                score: jaccard(query, text),
            };
        }),
        ...Array.from(postsById.values()).map((doc) => {
            const text = doc.title ?? '';
            return {
                ref: `page:${doc.id}`,
                kind: 'page' as const,
                text,
                keyphrase: doc.title ?? '',
                score: jaccard(query, text),
            };
        }),
    ];

    return items
        .filter((item) => item.text && item.score >= SHORTLIST_MIN_JACCARD)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.topN);
}

/**
 * Deterministic pre-judge check: the closest shortlist item whose keyphrase is
 * a near-exact token-set match for the candidate's primary keyword (Jaccard ≥
 * {@link AUTO_DUPLICATE_MIN_JACCARD}). Such pairs — reordered or reversed
 * phrasings like "cash to order" vs "order to cash" — target the same search
 * intent by definition, so we classify them `duplicate` without risking a judge
 * misfire. Returns null when nothing clears the bar, leaving the call to the LLM.
 */
export function findAutoDuplicate(
    candidateKeyword: string,
    shortlist: ShortlistItem[],
): ShortlistItem | null {
    let best: ShortlistItem | null = null;
    let bestScore = AUTO_DUPLICATE_MIN_JACCARD;
    for (const item of shortlist) {
        if (!item.keyphrase) continue;
        const score = jaccard(candidateKeyword, item.keyphrase);
        if (score >= bestScore) {
            best = item;
            bestScore = score;
        }
    }
    return best;
}

/** Renders the shortlist for the judge prompt, with stable refs. */
function renderShortlist(items: ShortlistItem[]): string {
    return items
        .map((item, i) => {
            const status = item.status ? `, ${item.status}` : '';
            return `${i + 1}. [${item.ref}] (${item.kind}${status}) "${item.text}"`;
        })
        .join('\n');
}

/** Asks the judge to classify one candidate against its shortlist. */
async function judgeCandidate(
    engine: ContentPipelineEngine,
    cluster: KeywordCluster,
    shortlist: ShortlistItem[],
): Promise<{
    verdict: DedupVerdict;
    matchedRef: string | null;
    reason: string;
    confidence: number;
}> {
    const keywords = cluster.keywords
        .slice(0, 8)
        .map((k) => k.keyword)
        .join(', ');

    const prompt = `Proposed topic:
- Primary keyword: "${cluster.primary.keyword}"
- Related keywords: ${keywords}

Existing items (judge the proposed topic against these):
${renderShortlist(shortlist)}

Classify the proposed topic. If it overlaps one of the existing items, set matchedRef to that item's ref.`;

    const { object } = await engine.agents.dedupJudgeAgent.generate(prompt, {
        structuredOutput: { schema: DedupVerdictSchema },
    });
    return object;
}

/**
 * Runs the near-duplicate gate over the (already exact-deduped) candidate
 * clusters. Returns the survivors plus a decision per candidate for the audit
 * trail. Pure read-only — persistence of dropped/flagged decisions is the
 * caller's job (see `recordDedupDecisions` in pipeline-core).
 */
export async function gateNearDuplicates(
    payload: Payload,
    engine: ContentPipelineEngine,
    clusters: KeywordCluster[],
    options: GateOptions,
): Promise<{ kept: KeywordCluster[]; decisions: DedupDecision[] }> {
    if (options.sensitivity === 'off' || clusters.length === 0) {
        return { kept: clusters, decisions: [] };
    }

    const failOpen = options.failOpen ?? true;
    const topN = options.shortlistTopN ?? SHORTLIST_TOP_N;
    const decisions: DedupDecision[] = [];
    const kept: KeywordCluster[] = [];

    // Tier 1a — collapse near-identical candidates within this run, keeping the
    // highest-scoring of each near-dup set (clusters arrive sorted best-first).
    const { kept: survivors, dropped: runDups } =
        collapseNearDuplicateClusters(clusters);
    for (const cluster of runDups) {
        decisions.push({
            clusterKey: cluster.clusterKey,
            primaryKeyword: cluster.primary.keyword,
            verdict: 'near-duplicate',
            kept: false,
            reason: 'Near-duplicate of a higher-scoring candidate in the same run.',
        });
    }

    // Tier 1b + Tier 2 — shortlist existing items, then judge each survivor.
    for (const cluster of survivors) {
        // Lazy judging: once we've kept enough for the caller's slice, stop
        // spending judge calls on the remaining (lower-scoring) survivors. They
        // get no decision, so they simply re-surface on the next run.
        if (
            options.maxNewTopics !== undefined &&
            kept.length >= options.maxNewTopics
        ) {
            break;
        }

        const shortlist = await buildDuplicateShortlist(payload, cluster, {
            marketLocale: options.marketLocale,
            topN,
        });

        if (shortlist.length === 0) {
            kept.push(cluster);
            decisions.push({
                clusterKey: cluster.clusterKey,
                primaryKeyword: cluster.primary.keyword,
                verdict: 'distinct',
                kept: true,
            });
            continue;
        }

        // Deterministic short-circuit: a near-exact keyphrase match is a
        // duplicate by construction (same tokens → same search intent), so we
        // drop it without spending — or trusting — a judge call. `duplicate` is
        // dropped under every non-off sensitivity.
        const autoDup = findAutoDuplicate(cluster.primary.keyword, shortlist);
        if (autoDup) {
            decisions.push({
                clusterKey: cluster.clusterKey,
                primaryKeyword: cluster.primary.keyword,
                verdict: 'duplicate',
                kept: false,
                matchedRef: autoDup.ref,
                reason: `Keyphrase is a near-exact match for ${autoDup.ref} ("${autoDup.keyphrase}").`,
                confidence: 1,
            });
            payload.logger.info(
                `Content pipeline: dedup "${cluster.clusterKey}" → duplicate ` +
                    `(auto, matched ${autoDup.ref}) — dropped [shortlist ${shortlist.length}]`,
            );
            continue;
        }

        let verdict: DedupVerdict;
        let matchedRef: string | undefined;
        let reason: string | undefined;
        let confidence: number | undefined;
        try {
            const judged = await judgeCandidate(engine, cluster, shortlist);
            verdict = judged.verdict;
            matchedRef = judged.matchedRef ?? undefined;
            reason = judged.reason;
            confidence = judged.confidence;
        } catch (error) {
            // Fail-open: a transient judge error shouldn't starve a small run.
            payload.logger.warn(
                `Content pipeline: dedup judge failed for "${cluster.clusterKey}" (${
                    error instanceof Error ? error.message : String(error)
                }) — ${failOpen ? 'keeping' : 'dropping'}.`,
            );
            verdict = 'distinct';
            reason = 'judge-error';
            if (failOpen) {
                kept.push(cluster);
            }
            decisions.push({
                clusterKey: cluster.clusterKey,
                primaryKeyword: cluster.primary.keyword,
                verdict,
                kept: failOpen,
                reason,
            });
            continue;
        }

        // Drop duplicates always; near-dups only under 'strict'.
        const drop =
            verdict === 'duplicate' ||
            (verdict === 'near-duplicate' && options.sensitivity === 'strict');

        if (!drop) kept.push(cluster);

        decisions.push({
            clusterKey: cluster.clusterKey,
            primaryKeyword: cluster.primary.keyword,
            verdict,
            kept: !drop,
            matchedRef,
            reason,
            confidence,
        });

        payload.logger.info(
            `Content pipeline: dedup "${cluster.clusterKey}" → ${verdict}` +
                `${matchedRef ? ` (matched ${matchedRef})` : ''}` +
                `${typeof confidence === 'number' ? ` @${confidence}` : ''}` +
                ` — ${drop ? 'dropped' : 'kept'} [shortlist ${shortlist.length}]`,
        );
    }

    return { kept, decisions };
}
