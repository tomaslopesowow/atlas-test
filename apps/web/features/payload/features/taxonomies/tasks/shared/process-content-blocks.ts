/**
 * @module processContentBlocks
 *
 * Shared utilities for processing CraftCMS content blocks and transforming them
 * into PayloadCMS block structures. Used by both article and press entry seeders.
 *
 * ## Key Features
 *
 * - **Content Block Transformation:** Converts CraftCMS blocks to PayloadCMS blocks
 *   - Text → RichText (HTML to Lexical conversion)
 *   - Quote → Quote block
 *   - Single Image → MediaBlock
 *   - Multiple Images → ImageMarquee (for galleries)
 *   - JSON media (YouTube/Vimeo) → Video blocks
 *   - Table → Table block
 *   - Fleet Yacht Items → FleetYachtItem blocks
 * - **Media Queue:** Collects all media uploads for async processing
 * - **Deduplication:** Checks for existing media before queueing uploads
 *
 * ## Data Sources
 *
 * The module reads from local JSONL file:
 * - `seed/craftcms/unique-contentblock-media.jsonl` - Media metadata with S3 URLs
 */

import type { Payload, TypedJobs } from 'payload';
import { Effect, Schema } from 'effect';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import type {
    ImageMarquee,
    MediaBlock,
    Page,
    Quote,
    RichText,
    Table,
    Vimeo,
    Youtube,
    FleetYachtItem,
} from '@/payload-types';
import {
    convertHTMLToLexical,
    type editorConfigFactory,
} from '@payloadcms/richtext-lexical';

type EditorConfig = Awaited<ReturnType<typeof editorConfigFactory.default>>;
import { VIMEO_URL_PATTERN } from '@/features/blocks/configs/vimeo';
import { YOUTUBE_URL_PATTERN } from '@/features/blocks/configs/youtube';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Path to the contentblock media JSONL file.
 * This file contains metadata for all media assets referenced in CraftCMS content blocks,
 * including S3 bucket/key information and URLs.
 */
const CONTENTBLOCK_MEDIA_FILE = path.join(
    process.cwd(),
    'seed/craftcms/unique-contentblock-media.jsonl',
);

// ─────────────────────────────────────────────────────────────────────────────
// Module-level Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache for loaded contentblock media (keyed by targetId).
 * Populated on first access by `loadContentBlockMedia()`.
 */
let contentBlockMediaCache: Map<number, ContentBlockMedia> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Effect Schema Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for CraftCMS content blocks.
 *
 * Represents the complete structure of content blocks exported from CraftCMS,
 * including text content, quotes, tables, media, and related yacht entries.
 * Contains all fields from CraftCMS export, though only a subset are used
 * during processing (unused fields are ignored).
 */
export type CraftCMSContentBlock = Schema.Schema.Type<
    typeof CraftCMSContentBlock
>;
export const CraftCMSContentBlock = Schema.Struct({
    siteId: Schema.NullishOr(Schema.Number),
    textContent: Schema.NullishOr(Schema.String),
    quoteText: Schema.NullishOr(Schema.String),
    quoteCitee: Schema.NullishOr(Schema.String),
    imageAlign: Schema.NullishOr(Schema.String),
    imageFullWidth: Schema.NullishOr(Schema.Number),
    galleryLayoutStyle: Schema.NullishOr(Schema.String),
    galleryGridCellSize: Schema.NullishOr(Schema.String),
    galleryGridFittingPolicy: Schema.NullishOr(Schema.String),
    relatedContentLayoutType: Schema.NullishOr(Schema.String),
    relatedContentFleetContext: Schema.NullishOr(Schema.String),
    relatedYachtEntries: Schema.NullishOr(
        Schema.Array(
            Schema.Struct({
                targetId: Schema.NullishOr(Schema.Number),
                slug: Schema.NullishOr(Schema.String),
                uri: Schema.NullishOr(Schema.String),
                entryTypeId: Schema.NullishOr(Schema.Number),
                sortOrder: Schema.NullishOr(Schema.Number),
            }),
        ),
    ),
    formTitle: Schema.NullishOr(Schema.String),
    formDescription: Schema.NullishOr(Schema.String),
    tableData: Schema.NullishOr(
        Schema.parseJson(
            Schema.Array(
                Schema.Struct({
                    col1: Schema.NullishOr(Schema.String),
                    col2: Schema.NullishOr(Schema.String),
                }),
            ),
        ),
    ),
    tableStyle: Schema.NullishOr(Schema.String),
    media: Schema.NullishOr(
        Schema.Array(
            Schema.Struct({
                fieldId: Schema.NullishOr(Schema.Number),
                targetId: Schema.NullishOr(Schema.Number),
                sortOrder: Schema.NullishOr(Schema.Number),
                filename: Schema.NullishOr(Schema.String),
                kind: Schema.NullishOr(Schema.String),
                alt: Schema.NullishOr(Schema.String),
                width: Schema.NullishOr(Schema.Any),
                height: Schema.NullishOr(Schema.Any),
                size: Schema.NullishOr(Schema.Any),
                focalPoint: Schema.NullishOr(Schema.Any),
                dateCreated: Schema.NullishOr(Schema.Date),
            }),
        ),
    ),
    dateCreated: Schema.NullishOr(Schema.Date),
    dateUpdated: Schema.NullishOr(Schema.Date),
});

/**
 * Schema for contentblock media entries extracted from CraftCMS.
 *
 * Each entry represents a media asset (image, video, JSON) that was used within
 * a CraftCMS content block. The schema includes S3 storage information for
 * reconstructing the full asset URL.
 *
 * @property targetId - Unique identifier linking the asset to its content block
 * @property fieldId - CraftCMS field ID (for reference)
 * @property filename - Original filename of the asset
 * @property kind - Asset type: 'image', 'json' (for video embeds), etc.
 * @property alt - Alt text for images
 * @property width/height - Dimensions for images
 * @property size - File size in bytes
 * @property focalPoint - Focal point coordinates for image cropping
 * @property dateCreated - Original creation date in CraftCMS
 * @property volumeHandle - CraftCMS volume identifier ('youtube', 'vimeo', or S3 bucket)
 * @property s3 - S3 bucket and key for direct asset access
 * @property url - Full URL to the asset
 */
type ContentBlockMedia = Schema.Schema.Type<typeof ContentBlockMedia>;
const ContentBlockMedia = Schema.Struct({
    targetId: Schema.Number,
    fieldId: Schema.NullishOr(Schema.Number),
    filename: Schema.String,
    kind: Schema.String,
    alt: Schema.NullishOr(Schema.String),
    width: Schema.NullishOr(Schema.String),
    height: Schema.NullishOr(Schema.String),
    size: Schema.NullishOr(Schema.Number),
    focalPoint: Schema.NullishOr(Schema.Any),
    dateCreated: Schema.NullishOr(Schema.String),
    volumeHandle: Schema.String,
    s3: Schema.Struct({
        bucket: Schema.String,
        key: Schema.String,
    }),
    url: Schema.String,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads the contentblock media JSONL file into memory.
 *
 * This function implements a module-level cache to avoid repeatedly reading
 * and parsing the JSONL file across multiple task invocations. The file is
 * read line-by-line using Node.js streams for memory efficiency.
 *
 * The JSONL file format has one JSON object per line, each representing a
 * media asset extracted from CraftCMS content blocks.
 *
 * @returns A Map keyed by targetId for O(1) lookup during block processing
 */
async function loadContentBlockMedia(): Promise<
    Map<number, ContentBlockMedia>
> {
    // Return cached data if already loaded
    if (contentBlockMediaCache) {
        return contentBlockMediaCache;
    }

    const mediaMap = new Map<number, ContentBlockMedia>();

    // Return empty map if file doesn't exist (graceful degradation)
    if (!fs.existsSync(CONTENTBLOCK_MEDIA_FILE)) {
        console.warn(
            `[shared/process-content-blocks] ContentBlock media file not found: ${CONTENTBLOCK_MEDIA_FILE}`,
        );
        contentBlockMediaCache = mediaMap;
        return mediaMap;
    }

    // Stream the file line-by-line to avoid loading entire file into memory
    const fileStream = fs.createReadStream(CONTENTBLOCK_MEDIA_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity, // Handle Windows CRLF line endings
    });

    // Parse each line as JSON and validate against schema
    for await (const line of rl) {
        try {
            const parsed = JSON.parse(line);
            const media = Schema.decodeUnknownSync(ContentBlockMedia, {
                onExcessProperty: 'preserve',
            })(parsed);
            if (media.targetId) {
                mediaMap.set(media.targetId, media);
            }
        } catch {
            // Skip invalid lines (malformed JSON or schema validation failures)
        }
    }

    contentBlockMediaCache = mediaMap;
    return mediaMap;
}

/**
 * Finds a contentblock media entry by its targetId.
 *
 * This is the primary lookup function used during block processing to resolve
 * media references from CraftCMS content blocks. The targetId links a content
 * block's media reference to the actual asset metadata.
 *
 * @param targetId - The CraftCMS target ID linking to the media asset
 * @returns The ContentBlockMedia entry with S3 URL information, or null if not found
 *
 * @example
 * const media = await findContentBlockMediaById(12345);
 * if (media) {
 *     console.log(media.url); // Full S3 URL to the asset
 * }
 */
export async function findContentBlockMediaById(
    targetId: number | null | undefined,
): Promise<ContentBlockMedia | null> {
    if (targetId == null) {
        return null;
    }

    const mediaMap = await loadContentBlockMedia();
    return mediaMap.get(targetId) ?? null;
}

/**
 * Clears the contentblock media cache.
 * Useful for testing scenarios where you need to reload the JSONL file,
 * or for long-running processes that need to free memory.
 * @internal
 */
export function _clearContentBlockMediaCache(): void {
    contentBlockMediaCache = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Processing Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input configuration for content block processing.
 */
export interface ProcessContentBlocksInput {
    /** PayloadCMS instance for database operations */
    payload: Payload;
    /** ID of the created document (article or press entry) */
    documentId: string;
    /** Content blocks from CraftCMS export (readonly from Effect Schema, may contain nulls) */
    contentBlocks:
        | ReadonlyArray<CraftCMSContentBlock | null | undefined>
        | null
        | undefined;
    /** Lexical editor configuration for HTML conversion */
    editorConfig: EditorConfig;
    /** JSDOM instance for HTML parsing */
    JSDOM: typeof import('jsdom').JSDOM;
    /** Log prefix for consistent logging */
    logPrefix: string;
    /** Whether to extract the first paragraph as introduction and remove it from the block. Default: true */
    extractIntroduction?: boolean;
}

/**
 * Output from content block processing.
 */
export interface ProcessContentBlocksOutput {
    /** Transformed PayloadCMS blocks ready to be saved */
    blocks: NonNullable<Page['blocks']>;
    /** Media upload job inputs to be queued */
    uploadQueueInput: Array<TypedJobs['tasks']['createUploadFromUrl']['input']>;
    /** Introduction extracted from first paragraph of first text block */
    introduction: string;
}

/**
 * Processes CraftCMS content blocks and transforms them into PayloadCMS blocks.
 *
 * This function handles the complex transformation of various CraftCMS content block
 * types into their PayloadCMS equivalents. It uses the Effect library for:
 * - Normalizing sync/async flows with Effect.gen generators
 * - Enabling parallel processing of image marquee items via Effect.all
 * - Collecting media upload queue inputs as side effects
 * - Avoiding deeply nested Promise chains
 *
 * ## Block Type Mapping
 *
 * | CraftCMS Type    | CraftCMS Fields                | PayloadCMS Block |
 * |------------------|--------------------------------|------------------|
 * | Text             | textContent                    | RichText         |
 * | Quote            | quoteText, quoteCitee          | Quote            |
 * | Single Image     | media[] (1 image)              | MediaBlock       |
 * | Gallery          | media[] (multiple images)      | ImageMarquee     |
 * | YouTube/Vimeo    | media[] (kind: 'json')         | Youtube/Vimeo    |
 * | Table            | tableData, tableStyle          | Table            |
 * | Fleet Yacht Item | relatedYachtEntries            | FleetYachtItem   |
 *
 * @param input - Configuration and data for block processing
 * @returns Transformed blocks and media upload queue inputs
 */
export async function processContentBlocks(
    input: ProcessContentBlocksInput,
): Promise<ProcessContentBlocksOutput> {
    const {
        payload,
        documentId,
        contentBlocks,
        editorConfig,
        JSDOM,
        logPrefix,
    } = input;

    type BlocksSignature = Effect.Effect<ProcessContentBlocksOutput>;

    const blocksProgram: BlocksSignature = Effect.gen(function* () {
        const resultBlocks: NonNullable<Page['blocks']> = [];
        const resultUploadQueueInput: Array<
            TypedJobs['tasks']['createUploadFromUrl']['input']
        > = [];
        let introduction = '';

        if (!contentBlocks) {
            payload.logger.info(
                `${logPrefix} No content blocks found for entry.`,
            );
            return yield* Effect.succeed({
                blocks: resultBlocks,
                uploadQueueInput: resultUploadQueueInput,
                introduction,
            });
        }

        // Clone contentBlocks to make it mutable (Effect Schema creates readonly arrays)
        // Type assertion is safe because structuredClone creates a deep mutable copy
        const mutableContentBlocks = structuredClone(contentBlocks) as Array<{
            textContent?: string | null;
            quoteText?: string | null;
            quoteCitee?: string | null;
            tableData?: Array<{
                col1?: string | null;
                col2?: string | null;
            }> | null;
            media?: Array<{
                targetId?: number | null;
                kind?: string | null;
                filename?: string | null;
            }> | null;
            relatedContentFleetContext?: string | null;
            relatedYachtEntries?: Array<{
                slug?: string | null;
                uri?: string | null;
            }> | null;
        } | null>;

        // Extract introduction from first paragraph of first text block
        const firstTextBlockIndex = mutableContentBlocks.findIndex(
            (block) => block?.textContent,
        );

        if (firstTextBlockIndex !== -1) {
            const firstTextBlock = mutableContentBlocks[firstTextBlockIndex];
            const html = firstTextBlock?.textContent || '';

            if (html) {
                payload.logger.info(
                    `${logPrefix} Extracting introduction from first text block.`,
                );

                const dom = new JSDOM(html);
                const firstParagraph = dom.window.document.querySelector('p');

                if (firstParagraph) {
                    // Extract the first paragraph as introduction
                    introduction = firstParagraph.outerHTML;

                    if (input.extractIntroduction !== false) {
                        // Remove the first paragraph from the original HTML
                        firstParagraph.remove();

                        // Update the block's textContent with the remaining HTML
                        const remainingHTML =
                            dom.window.document.body.innerHTML;

                        if (firstTextBlock) {
                            firstTextBlock.textContent = remainingHTML.trim();
                        }
                    }

                    payload.logger.info(
                        `${logPrefix} Extracted introduction (${introduction.length} chars).`,
                    );
                } else {
                    payload.logger.warn(
                        `${logPrefix} No <p> tag found in first text block.`,
                    );
                }
            }
        } else {
            payload.logger.warn(
                `${logPrefix} No text block found for introduction extraction.`,
            );
        }

        payload.logger.info(
            `${logPrefix} Starting block processing. Number of blocks: ${mutableContentBlocks.length}`,
        );

        for (const block of mutableContentBlocks) {
            if (!block) {
                payload.logger.info(
                    `${logPrefix} Skipping null content block.`,
                );
                continue;
            }

            const mediaImages = block?.media?.filter(
                (media) => media.kind === 'image',
            );

            const mediaJSON = block?.media?.filter(
                (media) => media.kind === 'json',
            );

            // Handle image marquee (multiple images)
            if (mediaImages && mediaImages.length > 1) {
                payload.logger.info(
                    `${logPrefix} Block contains image marquee (count: ${mediaImages.length})`,
                );
                const items: ImageMarquee['items'] = yield* Effect.all(
                    mediaImages.map((blockMediaItem) => {
                        let blockMediaItemIndex = 0;
                        return Effect.gen(function* () {
                            // create media placeholder
                            const marqueeItem: NonNullable<
                                ImageMarquee['items']
                            >[number] = {
                                media: {
                                    type: 'image',
                                    image: {
                                        objectFit: 'cover',
                                        objectPosition: 'center',
                                    },
                                },
                            };

                            payload.logger.info(
                                `${logPrefix} Processing image marquee item, targetId: ${blockMediaItem.targetId}`,
                            );

                            const blockMediaObject = yield* Effect.promise(() =>
                                findContentBlockMediaById(
                                    blockMediaItem.targetId,
                                ),
                            );

                            // queue media upload job as side effect
                            if (blockMediaObject?.url) {
                                payload.logger.info(
                                    `${logPrefix} Queueing image upload for media marquee item: url: ${blockMediaObject.url}`,
                                );
                                const existingMedia = yield* Effect.promise(
                                    () =>
                                        payload
                                            .find({
                                                collection: 'media',
                                                where: {
                                                    source: {
                                                        equals: blockMediaObject.url,
                                                    },
                                                },
                                                limit: 1,
                                            })
                                            .then((x) => x.docs.at(0)),
                                );

                                if (existingMedia) {
                                    payload.logger.info(
                                        `${logPrefix} Media already exists for url: ${blockMediaObject.url}. Assigning existing media and skipping upload.`,
                                    );
                                    marqueeItem.media ??= {};
                                    marqueeItem.media.image ??= {};
                                    marqueeItem.media.image.media =
                                        existingMedia;
                                } else {
                                    resultUploadQueueInput.push({
                                        url: blockMediaObject.url,
                                        target: {
                                            collection: 'pages',
                                            doc: documentId,
                                            path: `blocks.${resultBlocks.length}.items.${blockMediaItemIndex++}.media.image.media`,
                                        },
                                    });
                                }
                            } else {
                                payload.logger.info(
                                    `${logPrefix} No url present for image marquee item. Skipping upload.`,
                                );
                            }

                            return marqueeItem;
                        });
                    }),
                );
                payload.logger.info(
                    `${logPrefix} Built image marquee block with ${items.length} items.`,
                );
                const imageMarqueeBlock: ImageMarquee = {
                    blockType: 'image-marquee' as const,
                    items,
                    layout: {
                        width: 'fluid',
                        horizontalPadding: '0',
                        paddingTop: '2',
                        paddingBottom: '2',
                    },
                };

                resultBlocks.push(imageMarqueeBlock);
                continue;
            }

            // Handle single image
            if (mediaImages && mediaImages.length === 1) {
                payload.logger.info(
                    `${logPrefix} Block contains a single image.`,
                );
                const mediaBlock: MediaBlock = {
                    blockType: 'media-block',
                    media: {
                        type: 'image',
                        image: {
                            objectFit: 'cover',
                            objectPosition: 'center',
                        },
                    },
                    layout: {
                        width: 'fluid',
                    },
                };

                const blockMediaObject = yield* Effect.promise(() =>
                    findContentBlockMediaById(
                        // biome-ignore lint/style/noNonNullAssertion: validated above
                        mediaImages[0]!.targetId,
                    ),
                );

                // queue media upload job as side effect
                if (blockMediaObject?.url) {
                    payload.logger.info(
                        `${logPrefix} Queueing image upload for media-block: url: ${blockMediaObject.url}`,
                    );
                    const existingMedia = yield* Effect.promise(() =>
                        payload
                            .find({
                                collection: 'media',
                                where: {
                                    source: {
                                        equals: blockMediaObject.url,
                                    },
                                },
                                limit: 1,
                            })
                            .then((x) => x.docs.at(0)),
                    );

                    if (existingMedia) {
                        payload.logger.info(
                            `${logPrefix} Media already exists for url: ${blockMediaObject.url}. Assigning existing media and skipping upload.`,
                        );
                        mediaBlock.media ??= {};
                        mediaBlock.media.image ??= {};
                        mediaBlock.media.image.media = existingMedia;
                    } else {
                        resultUploadQueueInput.push({
                            url: blockMediaObject.url,
                            target: {
                                collection: 'pages',
                                doc: documentId,
                                path: `blocks.${resultBlocks.length}.media.image.media`,
                            },
                        });
                    }
                }

                resultBlocks.push(mediaBlock);
                continue;
            }

            // Handle JSON media (YouTube/Vimeo)
            if (mediaJSON && mediaJSON.length > 0) {
                payload.logger.info(
                    `${logPrefix} Block contains JSON media (count: ${mediaJSON.length})`,
                );
                for (const media of mediaJSON) {
                    if (!media?.targetId) {
                        payload.logger.info(
                            `${logPrefix} Skipping JSON media: no targetId`,
                        );
                        continue;
                    }
                    const blockMediaObject = yield* Effect.promise(() =>
                        findContentBlockMediaById(media.targetId),
                    );

                    if (!blockMediaObject) {
                        payload.logger.info(
                            `${logPrefix} No block media object found for targetId: ${media.targetId}`,
                        );
                        continue;
                    }

                    payload.logger.info(
                        `${logPrefix} Fetched media for JSON, url: ${blockMediaObject.url || 'null'}`,
                    );

                    const blockMediaContent = yield* Effect.promise(() =>
                        fetch(blockMediaObject.url)
                            .then((res) => res.json())
                            .catch(() => {
                                payload.logger.error(
                                    `${logPrefix} Error fetching block media content: ${blockMediaObject.url}`,
                                );
                                return null;
                            }),
                    );

                    if (
                        typeof blockMediaContent?.url === 'string' &&
                        YOUTUBE_URL_PATTERN.test(blockMediaContent.url)
                    ) {
                        payload.logger.info(
                            `${logPrefix} Creating Youtube block, url: ${blockMediaContent.url}`,
                        );
                        const youtubeBlock: Youtube = {
                            blockType: 'youtube',
                            url: blockMediaContent.url,
                        };
                        resultBlocks.push(youtubeBlock);
                        continue;
                    }

                    if (
                        typeof blockMediaContent?.url === 'string' &&
                        VIMEO_URL_PATTERN.test(blockMediaContent.url)
                    ) {
                        payload.logger.info(
                            `${logPrefix} Creating Vimeo block, url: ${blockMediaContent.url}`,
                        );
                        const vimeoBlock: Vimeo = {
                            blockType: 'vimeo',
                            url: blockMediaContent.url,
                        };
                        resultBlocks.push(vimeoBlock);
                    }
                }
                continue;
            }

            // Handle text content
            if (block?.textContent) {
                payload.logger.info(`${logPrefix} Processing RichText block.`);
                const richTextBlock: RichText = {
                    blockType: 'rich-text',
                    content: convertHTMLToLexical({
                        editorConfig,
                        html: block.textContent,
                        JSDOM,
                    }),
                    layout: {
                        paddingTop: '1',
                        paddingBottom: '1',
                    },
                };
                resultBlocks.push(richTextBlock);
                continue;
            }

            // Handle quote
            if (block?.quoteText) {
                payload.logger.info(`${logPrefix} Processing Quote block.`);
                const quoteBlock: Quote = {
                    blockType: 'quote' as const,
                    quote: {
                        root: {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: block.quoteText,
                                            type: 'text',
                                            version: 1,
                                        },
                                    ],
                                    direction: null,
                                    format: '',
                                    indent: 0,
                                    type: 'paragraph',
                                    version: 1,
                                    textFormat: 0,
                                    textStyle: '',
                                },
                            ],
                            direction: null,
                            format: '' as const,
                            indent: 0,
                            type: 'root',
                            version: 1,
                        },
                    },

                    citee: {
                        name: block.quoteCitee,
                    },
                };
                resultBlocks.push(quoteBlock);
                continue;
            }

            // Handle table
            if (block?.tableData) {
                payload.logger.info(`${logPrefix} Processing Table block.`);
                const tableBlock: Table = {
                    blockType: 'table',
                    tableData: block.tableData.map((row) => ({
                        header: row.col1,
                        value: row.col2,
                    })),
                    layout: {
                        paddingTop: '2',
                        paddingBottom: '2',
                    },
                };
                resultBlocks.push(tableBlock);
                continue;
            }

            // Handle fleet yacht items (all contexts: fleet, brokerage, etc.)
            if (
                block.relatedYachtEntries &&
                block.relatedYachtEntries.length > 0
            ) {
                const context = block.relatedContentFleetContext || 'unknown';

                // Remove duplicate yacht entries by slug
                // Use slug or extract from URI as the deduplication key
                const uniqueRelatedYachtEntries = new Map<
                    string,
                    (typeof block.relatedYachtEntries)[number]
                >();

                for (const entry of block.relatedYachtEntries) {
                    // Extract slug from entry or URI (e.g., "fleet/valor" -> "valor")
                    const slug = entry.slug || entry.uri?.replace('fleet/', '');

                    if (slug) {
                        // Only add if we don't already have this slug (keeps first occurrence)
                        if (!uniqueRelatedYachtEntries.has(slug)) {
                            uniqueRelatedYachtEntries.set(slug, entry);
                        }
                    } else {
                        payload.logger.warn(
                            `${logPrefix} Yacht entry has no slug or URI: ${JSON.stringify(entry)}`,
                        );
                    }
                }

                const beforeCount = block.relatedYachtEntries.length;
                const afterCount = uniqueRelatedYachtEntries.size;
                const duplicatesRemoved = beforeCount - afterCount;

                payload.logger.info(
                    `${logPrefix} Processing Fleet Yacht Item block (context: ${context}) with ${afterCount} unique yacht(s)${duplicatesRemoved > 0 ? ` (removed ${duplicatesRemoved} duplicate${duplicatesRemoved > 1 ? 's' : ''})` : ''}.`,
                );

                for (const yachtEntry of uniqueRelatedYachtEntries.values()) {
                    // Extract slug from URI (e.g., "fleet/valor" -> "valor")
                    const yachtSlug =
                        yachtEntry.slug ||
                        yachtEntry.uri?.replace('fleet/', '');

                    if (!yachtSlug) {
                        // This shouldn't happen as we filtered above, but keep as safety check
                        payload.logger.warn(
                            `${logPrefix} Yacht entry has no slug: ${JSON.stringify(yachtEntry)}`,
                        );
                        continue;
                    }

                    const fleetYachtItemBlock: FleetYachtItem = {
                        blockType: 'fleet-yacht-item',
                        type: 'slug',
                        slug: yachtSlug,
                    };
                    resultBlocks.push(fleetYachtItemBlock);
                }

                continue;
            }

            payload.logger.info(`${logPrefix} Unknown block type. Skipping.`);
            payload.logger.info(block);
        }

        payload.logger.info(
            `${logPrefix} Block processing complete. Total blocks: ${resultBlocks.length}`,
        );

        return yield* Effect.succeed({
            blocks: resultBlocks,
            uploadQueueInput: resultUploadQueueInput,
            introduction,
        });
    });

    // Execute the Effect program
    payload.logger.info(`${logPrefix} Executing block generation program.`);
    const result = await Effect.runPromise(blocksProgram);

    payload.logger.info(
        `${logPrefix} Blocks generated. Total blocks: ${result.blocks.length}`,
    );
    payload.logger.info(
        `${logPrefix} Upload queue input generated. Total items: ${result.uploadQueueInput.length}`,
    );

    return result;
}
