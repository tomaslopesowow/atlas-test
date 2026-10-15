import { z } from 'zod';
import type { SeoAgents } from '../mastra/agents/seo-writer';
import { languageName } from '../mastra/schemas';

const AltSchema = z.object({
    alt: z
        .string()
        .describe(
            'Concise alt text, under 125 characters, no "image of"/"illustration of" prefix.',
        ),
});

export async function generateAltText(
    agent: SeoAgents['seoStrategistAgent'],
    options: { title: string; languageCode: string },
): Promise<string> {
    const language = languageName(options.languageCode);
    const { object } = await agent.generate(
        `Write concise, accessible alt text (under 125 characters) in ${language} for a branded editorial collage illustration used as the header image of a blog article titled "${options.title}". Describe what the illustration conceptually depicts. Do not start with "Image of" or "Illustration of". Plain text only.`,
        { structuredOutput: { schema: AltSchema } },
    );

    return object.alt.trim();
}
