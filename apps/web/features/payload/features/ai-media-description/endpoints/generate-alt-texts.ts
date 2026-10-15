import type { Maybe } from '@/utils/maybe';
import config from '@payload-config';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { type Endpoint, type Locale, getPayload } from 'payload';
import { z } from 'zod';

const PROMPT = (
    locales: ReadonlyArray<string>,
) => `You are an accessibility-focused content generator.

- Your task is to generate concise, meaningful alt text for a given image, in multiple locales. Follow these rules strictly for each locale:
- Describe the main content of the image — including objects, people, setting, action, or mood.
- Analyze the title for recognizable or meaningful names (e.g., company, product, event, brand).
- If the title includes a name like "CIRCL" or other identifiers, you should prefer to include it in the alt text — as long as it adds clarity or relevance.
- Do not include the title blindly — only use it if it enhances understanding of the image.
- Use natural, descriptive language — do not start with "Image of" or "Picture showing".
- Keep the alt text under 125 characters, unless the image is complex (e.g., UI, dashboard, infographic).
- Output only plain alt text — no labels, no markdown, no quotation marks.
- Return an array of strings. Each string must be the alt text generated in the corresponding locale from the input array locales. The output format must be in JSON, and contain the following format:
["<alt text in locale[0]>", "<alt text in locale[1]>", ..., "<alt text in locale[n]>"]

Process for all locales provided in the locales array input.

Write the alt texts in the following locales: ${locales.join(', ')}
`;

type GenerateAltTextsProps = {
    openAiKey: string;
    locales: Maybe<Locale[] | string[]>;
};

// Endpoint which returns AI generated alt text for either an URL or a file, in all provided locales.
export const generateAltTexts = ({
    openAiKey,
    locales: localesInput,
}: GenerateAltTextsProps): Endpoint => ({
    path: '/ai-media-description/generate-alt-texts',
    method: 'post',
    handler: async (request) => {
        const payload = await getPayload({ config });

        const { user } = await payload.auth(request);

        if (!user)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );

        if (!openAiKey)
            return NextResponse.json(
                { error: 'OpenAI API key not found' },
                { status: 404 },
            );

        if (!request.formData)
            return NextResponse.json(
                { error: 'No form data provided' },
                { status: 400 },
            );

        const requestFormat = z.object({
            image: z.instanceof(File).or(z.string()),
            locales: z.array(z.string()),
        });

        const { image, locales = localesInput } = Object.fromEntries(
            (await request.formData()).entries(),
        );

        const parsedData = requestFormat.safeParse({ image, locales });

        if (!parsedData.success) {
            return NextResponse.json(
                {
                    error: 'Invalid request body',
                },
                { status: 400 },
            );
        }

        if (!(image instanceof File) && process.env.NODE_ENV === 'development')
            return NextResponse.json(
                { error: 'Image generation with URL disabled in development' },
                { status: 418 },
            );

        const openai = new OpenAI({
            apiKey: openAiKey,
        });

        const formattedLocales = (
            typeof locales === 'string' ? JSON.parse(locales) : locales
        ) as string[];

        const responseFormat = z.object(
            Object.fromEntries(
                formattedLocales.map((locale) => [locale, z.string()]),
            ),
        );

        let openaiValid = true;

        const inputFormat =
            image instanceof File
                ? {
                      file_id: (
                          await openai.files
                              .create({
                                  file: new File(
                                      [image],
                                      image.name.toLowerCase(),
                                  ),
                                  purpose: 'vision',
                              })
                              .catch((error) => {
                                  Sentry.captureException(error);
                                  openaiValid = false;
                              })
                      )?.id,
                  }
                : { image_url: image };

        if (!openaiValid)
            return NextResponse.json(
                {
                    error: 'Failed to initialize OpenAI. This is likely due to an invalid API key.',
                },
                { status: 401 },
            );

        const response = (await openai.responses
            .create({
                model: 'gpt-4o-mini',
                text: {
                    format: zodTextFormat(responseFormat, 'translations'),
                },
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: PROMPT(formattedLocales),
                            },
                            {
                                type: 'input_image',
                                detail: 'low',
                                ...inputFormat,
                            },
                        ],
                    },
                ],
            })
            .catch((error) => {
                Sentry.captureException(error);
                openaiValid = false;
            })) as OpenAI.Responses.Response;

        if (!openaiValid)
            return NextResponse.json(
                {
                    error: 'Failed to initialize OpenAI. This is likely due to insufficient access with the provided API key.',
                },
                { status: 403 },
            );

        return NextResponse.json(response.output_text);
    },
});
