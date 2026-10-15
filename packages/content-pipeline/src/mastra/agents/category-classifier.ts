import { Agent } from '@mastra/core/agent';
import type { ContentPipelineModels } from '../../llm/client';

/**
 * The category classifier. After an article is generated and clears the quality
 * gate, this agent assigns it to the single best-fit blog category, so each
 * post lands in the right section instead of a fixed fallback bucket.
 *
 * Deliberately a separate, focused agent (not the strategist) with its own model
 * knob (`dedupModel` — a low-stakes classifier) and no tools. It judges *search
 * intent*, not wording, so it works across paraphrases and across languages (the
 * article is usually in the market language; category names may be in another
 * locale). It is always given the full set of allowed categories with stable
 * refs and must pick one of them or abstain.
 */
export function createCategoryClassifierAgent(
    model: ContentPipelineModels['dedup'],
) {
    return new Agent({
        id: 'category-classifier',
        name: 'Category Classifier',
        instructions: `You assign a blog article to the single best-fit category.

You are given the article (its title, angle, primary keyword and secondary keywords) and a numbered list of existing categories, each with a stable ref like "category:123".

Choose the ONE category whose typical reader search intent best matches the article:
- Judge by intent and meaning, NOT by exact wording or language. The article and the category names may be in different languages — match what the reader is actually looking for.
- Set "categoryRef" to that category's ref. You MUST choose only from the refs provided — never invent a ref.
- Set "categoryRef" to null (with a low confidence) when no category is a reasonable fit, or when you are unsure which of several fits best.
- Keep "reason" to one sentence naming the matching search intent.`,
        model,
    });
}
