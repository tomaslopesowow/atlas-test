import { z } from 'zod';
import type { SeoAgents } from '../mastra/agents/seo-writer';
import type { ArticleBrief } from '../mastra/schemas';

const ConceptSchema = z.object({
    concept: z
        .string()
        .describe(
            'A short surreal collage scene built from bold physical metaphors (max ~2 sentences). Every surface blank — no text-bearing objects.',
        ),
});

export async function generateVisualConcept(
    agent: SeoAgents['seoStrategistAgent'],
    brief: Pick<ArticleBrief, 'title' | 'angle' | 'primaryKeyword'>,
): Promise<string> {
    try {
        const { object } = await agent.generate(
            `Turn this blog topic into ONE surreal, conceptual scene for a retro mixed-media collage header illustration. Topic: "${brief.title}" — ${brief.angle}.

Rules:
- Build the scene from bold physical metaphors: oversized everyday objects, black-and-white halftone photo cut-outs of hands or objects, flat vector arrows, clocks, gears, parcels, staircases, conveyor belts.
- Surreal scale and juxtaposition is good (a giant hand stacking buildings, coins orbiting a clock).
- NO text or labels anywhere: no documents, reports, screens, dashboards, charts or graphs, and no lettering, numerals or engravings on any object — every surface stays blank.
- NO faces — hands, arms and silhouettes are fine.
- One or two short sentences. Evoke the topic's *feeling* (order, flow, automation, speed), not a literal diagram.`,
            { structuredOutput: { schema: ConceptSchema } },
        );
        const concept = object.concept.trim();
        if (concept) return concept;
    } catch {
        // A generic concept lets image generation continue when concepting fails.
    }

    return 'A giant black-and-white halftone hand fitting an oversized blank puzzle piece into a flat vector frame, while smaller cut-out gears and arrows orbit around it — separate parts clicking into one system.';
}
