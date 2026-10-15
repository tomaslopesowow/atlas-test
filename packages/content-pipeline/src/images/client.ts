import { createFalClient, type FalClient } from '@fal-ai/client';

const DEFAULT_IMAGE_MODEL = 'fal-ai/imagen4/preview';
const DEFAULT_IMAGE_STYLE = 'digital_illustration';

const IMAGE_SIZE_BY_RATIO: Record<string, string> = {
    '16:9': 'landscape_16_9',
    '4:3': 'landscape_4_3',
    '1:1': 'square_hd',
};

const NO_TEXT_NEGATIVE =
    'text, letters, words, numbers, charts, graphs, people, faces';

type ModelFamily = 'imagen' | 'ideogram' | 'recraft' | 'flux';

const FAMILIES: ModelFamily[] = ['imagen', 'ideogram', 'recraft', 'flux'];

const PROMPT_MAX_LENGTH_BY_FAMILY: Partial<Record<ModelFamily, number>> = {
    recraft: 1000,
};

export type FalImageOptions = {
    apiKey: string;
    model?: string;
    style?: string;
    maxAttempts?: number;
};

export type GeneratedImage = { buffer: Buffer; mimetype: string };

type FalImage = { url?: string; content_type?: string };

type FalImageResult = {
    images?: FalImage[];
    image?: FalImage;
};

function modelFamily(model: string): ModelFamily | null {
    const segments = model.toLowerCase().split('/');
    return (
        FAMILIES.find((family) =>
            segments.some((segment) => segment.startsWith(family)),
        ) ?? null
    );
}

export function imagePromptMaxLength(model: string): number | undefined {
    const family = modelFamily(model);
    return family ? PROMPT_MAX_LENGTH_BY_FAMILY[family] : undefined;
}

function buildModelInput(
    model: string,
    prompt: string,
    aspectRatio: string,
    style: string,
): Record<string, unknown> {
    const imageSize = IMAGE_SIZE_BY_RATIO[aspectRatio] ?? 'landscape_16_9';

    switch (modelFamily(model)) {
        case 'imagen':
            return { prompt, aspect_ratio: aspectRatio };
        case 'ideogram':
            return {
                prompt,
                image_size: imageSize,
                style: 'DESIGN',
                negative_prompt: NO_TEXT_NEGATIVE,
            };
        case 'recraft':
            return { prompt, image_size: imageSize, style };
        default:
            return { prompt, image_size: imageSize };
    }
}

async function generateImage(
    client: FalClient,
    model: string,
    style: string,
    options: { prompt: string; aspectRatio: string },
): Promise<GeneratedImage> {
    const result = await client.subscribe(model, {
        input: buildModelInput(
            model,
            options.prompt,
            options.aspectRatio,
            style,
        ),
    });

    const data = result.data as FalImageResult;
    const image = data.images?.[0] ?? data.image;
    if (!image?.url) {
        throw new Error('fal returned no image URL.');
    }

    const response = await fetch(image.url);
    if (!response.ok) {
        throw new Error(
            `Failed to download generated image (HTTP ${response.status}).`,
        );
    }

    return {
        buffer: Buffer.from(await response.arrayBuffer()),
        mimetype:
            image.content_type ??
            response.headers.get('content-type') ??
            'image/png',
    };
}

export function createFalImageGenerator(options: FalImageOptions) {
    const client = createFalClient({ credentials: options.apiKey });
    const model = options.model ?? DEFAULT_IMAGE_MODEL;
    const style = options.style ?? DEFAULT_IMAGE_STYLE;

    return {
        maxAttempts:
            Number.isInteger(options.maxAttempts) &&
            (options.maxAttempts ?? 0) > 0
                ? (options.maxAttempts ?? 3)
                : 3,
        promptMaxLength: imagePromptMaxLength(model),
        generate: (input: { prompt: string; aspectRatio: string }) =>
            generateImage(client, model, style, input),
    };
}

export type FalImageGenerator = ReturnType<typeof createFalImageGenerator>;
