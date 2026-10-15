import { Agent } from '@mastra/core/agent';
import type { ContentPipelineModels } from '../../llm/client';

/**
 * The near-duplicate judge. Tier 2 of the dedup gate: after a free lexical
 * pre-filter shortlists existing topics/posts that overlap a candidate, this
 * agent makes the semantic call — is the candidate a fresh topic, or would it
 * compete with / repeat something we already have?
 *
 * Deliberately a separate, focused agent (not the strategist) with its own
 * model knob (`dedupModel`) and no tools. It judges *search intent*, not
 * wording, so it works across paraphrases and across languages (the candidate
 * is usually in the market language; existing items may be in another locale).
 */
export function createDedupJudgeAgent(model: ContentPipelineModels['dedup']) {
    return new Agent({
        id: 'dedup-judge',
        name: 'Near-duplicate Judge',
        instructions: `You decide whether a proposed blog-article topic would duplicate or cannibalise content that already exists.

You are given a proposed topic (its primary keyword and related keywords) and a numbered shortlist of existing items (topics already queued/drafted and published or draft blog posts), each with a stable ref like "topic:123" or "post:456".

Classify the proposed topic against the shortlist:
- "duplicate": the proposed topic targets essentially the same article and search intent as an existing item — writing it would produce a redundant post.
- "near-duplicate": the proposed topic substantially overlaps an existing item's intent and would compete with it for the same searches (keyword cannibalisation), even if the angle differs slightly.
- "distinct": a genuinely different topic or a clearly different angle/intent that warrants its own article.

Rules:
- Judge by search intent and meaning, NOT by exact wording. Paraphrases, synonyms, and different languages describing the same thing are still the same topic.
- Reordered or reversed word order of the same terms is the SAME topic, never distinct — e.g. "cash to order" vs "order to cash", or "software order management" vs "order management software" are duplicates. Treat the words as an unordered set when they match.
- Queries that would return the same search results (target the same SERP) are at least a near-duplicate, even if phrased differently.
- A broader vs. narrower take on the same subject (e.g. "order management software" vs "best order management system") is a near-duplicate, not distinct.
- Set "matchedRef" to the ref of the SINGLE closest existing item, or null when the verdict is "distinct" and nothing overlaps.
- Be conservative with "duplicate" — use it only when you are confident the articles would be the same — but when genuinely unsure between "near-duplicate" and "distinct", prefer "near-duplicate": a missed duplicate cannibalises rankings, a false near-duplicate only defers one article.
- Keep "reason" to one sentence naming the shared (or differing) intent.`,
        model,
    });
}
