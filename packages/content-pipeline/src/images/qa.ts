import type { LanguageModelV3 } from '@ai-sdk/provider';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const QaSchema = z.object({
    hasText: z
        .boolean()
        .describe(
            'true if the image contains ANY readable or gibberish text, letters, words, numbers, labels, captions, charts, graphs, or UI/dashboard mockups — even small ones',
        ),
});

export type ImageQaVerdict = 'clean' | 'has-text' | 'qa-unavailable';

export async function inspectImageForText(
    model: LanguageModelV3,
    buffer: Buffer,
    mimetype: string,
): Promise<ImageQaVerdict> {
    try {
        const { output } = await generateText({
            model,
            output: Output.object({ schema: QaSchema }),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Does this illustration contain any text, letters, words, numbers, labels, captions, charts, graphs, or UI/dashboard mockups? Even small or gibberish text counts.',
                        },
                        {
                            type: 'image',
                            image: buffer,
                            mediaType: mimetype,
                        },
                    ],
                },
            ],
        });
        return output.hasText ? 'has-text' : 'clean';
    } catch {
        return 'qa-unavailable';
    }
}
