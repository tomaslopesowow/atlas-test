/**
 * @module seedArticleFromCraftCMS
 *
 * This module provides a PayloadCMS background task for migrating articles from CraftCMS
 * exports into PayloadCMS. It handles the complex transformation of CraftCMS content blocks,
 * media references, tags, and authors into PayloadCMS's page structure.
 *
 * ## Architecture
 *
 * The article migration follows a two-stage pipeline:
 *
 * ```
 * ┌─────────────────────────┐     ┌──────────────────┐
 * │ seedArticleFromCraftCMS │────▶│createUploadFromUrl│
 * │    (Page Creator)       │     │ (Media Handler)  │
 * └─────────────────────────┘     └──────────────────┘
 *       taxonomy-sync               media-sync
 *          queue                      queue
 * ```
 *
 * ## Key Features
 *
 * - **Content Block Transformation:** Converts CraftCMS blocks to PayloadCMS blocks
 *   - Text → RichText (HTML to Lexical conversion)
 *   - Quote → Quote block
 *   - Image → MediaBlock or ImageMarquee (for galleries)
 *   - Table → Table block
 *   - JSON media (YouTube/Vimeo) → Video blocks
 * - **Tag to Category Mapping:** Maps CraftCMS tags to taxonomy categories
 * - **Author Resolution:** Finds or creates Person records for authors
 * - **Redirect Creation:** Creates redirects from old CraftCMS URIs
 * - **Media Queue:** Queues all media uploads for async processing
 *
 * ## Data Sources
 *
 * The task reads from local JSONL files (extracted from CraftCMS):
 * - `seed/craftcms/unique-contentblock-media.jsonl` - Media metadata with S3 URLs
 * - `seed/craftcms/unique-authors.jsonl` - Author information
 *
 * ## Usage
 *
 * Typically called from a migration script that reads the CraftCMS export:
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'seedArticleFromCraftCMS',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         data: articleFromCraftCMS,
 *         parentPageId: newsOverviewPageId,
 *         pageTemplateId: articleTemplateId,
 *     },
 * });
 * ```
 */

import type { TaskConfig } from 'payload';
import { formatSlug } from '@/features/payload/fields/slug/formatSlug';
import { Option, pipe, Schema } from 'effect';
import type { NEWS_TAXONOMY_CATEGORIES } from '../shared';
import { editorConfigFactory } from '@payloadcms/richtext-lexical';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import type { Person } from '@/payload-types';
import * as Sentry from '@sentry/nextjs';
import {
    processContentBlocks,
    CraftCMSContentBlock,
} from './shared/process-content-blocks';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base URL for CraftCMS media files stored in S3.
 * Used to construct full URLs for cover images and related assets.
 */
const S3_AMAZONAWS_URL = 'https://stomp-feadship-prod.s3.amazonaws.com';

/**
 * Path to the authors JSONL file.
 * This file contains author information extracted from CraftCMS,
 * used to create or match Person records in PayloadCMS.
 */
const AUTHORS_FILE = path.join(
    process.cwd(),
    'seed/craftcms/unique-authors.jsonl',
);

// ─────────────────────────────────────────────────────────────────────────────
// Module-level Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache for loaded authors (keyed by author id).
 * Populated on first access by `loadAuthors()`.
 */
let authorsCache: Map<number, Author> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Tag to Category Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps CraftCMS tag slugs to PayloadCMS taxonomy categories.
 *
 * CraftCMS uses a flat tag system, while PayloadCMS uses structured categories.
 * This mapping consolidates related tags into broader categories:
 *
 * - **design**: Design-related topics (architecture, concept design, etc.)
 * - **innovation**: Technology and future concepts
 * - **sustainability**: Environmental and fuel-related topics
 * - **crafting**: Materials and craftsmanship
 * - **perspectives**: Industry trends and opinions
 * - **events**: Boat shows and events
 * - **milestones**: Launches, anniversaries, heritage
 *
 * The mapping is based on TAG_TAXONOMY_MAPPING.md in the project documentation.
 */
const TAG_TO_TAXONOMY_MAP: Record<
    string,
    keyof typeof NEWS_TAXONOMY_CATEGORIES
> = {
    // Design
    design: 'design',
    glass: 'design',
    'studio-de-voogt': 'design',
    'concept-design': 'design',
    'super-yacht-design': 'design',
    'smart-design': 'design',
    'naval-architecture-design': 'design',
    architecture: 'design',
    spiral: 'design',
    motion: 'design',
    poolslosh: 'design',
    pool: 'design',
    'de-voogt': 'design',
    bow: 'design',
    'naval-architect': 'design',

    // Innovation
    innovation: 'innovation',
    'future-concepts': 'innovation',
    ai: 'innovation',
    automation: 'innovation',
    'big-data': 'innovation',
    'machine-learning': 'innovation',
    technology: 'innovation',
    data: 'innovation',
    systems: 'innovation',

    // Sustainability
    sustainability: 'sustainability',
    energy: 'sustainability',
    fuel: 'sustainability',
    methanol: 'sustainability',
    'fuel-cells': 'sustainability',
    nuclear: 'sustainability',
    'green-technology': 'sustainability',
    emissions: 'sustainability',
    hydrogen: 'sustainability',
    hvo: 'sustainability',
    biofuel: 'sustainability',
    'alternative-fuel': 'sustainability',
    gtl: 'sustainability',
    batteries: 'sustainability',
    electric: 'sustainability',
    solar: 'sustainability',
    'fuel-cell': 'sustainability',
    'sustainable-fuel': 'sustainability',
    'carbon-reduction': 'sustainability',
    'net-zero-co2-fuel': 'sustainability',

    // Crafting
    craftsmanship: 'crafting',
    quality: 'crafting',
    dna: 'crafting',
    composite: 'crafting',
    aluminium: 'crafting',
    teak: 'crafting',
    wood: 'crafting',
    paint: 'crafting',
    'alternative-decking': 'crafting',

    // Perspectives
    'public-opinion': 'perspectives',
    trends: 'perspectives',
    'super-yacht-trends': 'perspectives',
    luxury: 'perspectives',
    uniquity: 'perspectives',
    comfort: 'perspectives',
    performance: 'perspectives',

    // Events
    events: 'events',
    'boat-shows': 'events',
    flibs: 'events',
    flibs23: 'events',
    mys: 'events',
    mys22: 'events',
    mys23: 'events',
    'monaco-yacht-show': 'events',
    'yacht-show': 'events',
    hiswa: 'events',
    'fort-lauderdale': 'events',
    monaco: 'events',
    miami: 'events',
    singapore: 'events',
    dubai: 'events',
    'palm-beach': 'events',
    venice: 'events',
    'port-hercule': 'events',
    superyachts: 'events',
    makkum: 'events',
    awards: 'events',
    wsa: 'events',
    event: 'events',
    amsterdam: 'events',
    aalsmeer: 'events',
    recap: 'events',

    // Milestones
    launch: 'milestones',
    first: 'milestones',
    heritage: 'milestones',
    anniversary: 'milestones',
    '70-years': 'milestones',
    'heritage-fleet': 'milestones',
    feadship: 'milestones',
    unveils: 'milestones',
    transport: 'milestones',
    laucnh: 'milestones', // typo
    launh: 'milestones', // typo
    outofshed: 'milestones',
    seatr: 'milestones',
    seatrial: 'milestones',
    'sea-trials': 'milestones',
    refit: 'milestones',
    fleet: 'milestones',
    yeti: 'milestones',
    pilot: 'milestones',
    // Yacht names → milestones
    istros: 'milestones',
    'lady-s': 'milestones',
    faith: 'milestones',
    aquarius: 'milestones',
    zephyr: 'milestones',
    yemoja: 'milestones',
    vertigo: 'milestones',
    venus: 'milestones',
    vanish: 'milestones',
    utopia: 'milestones',
    symphony: 'milestones',
    syzygy: 'milestones',
    solemates: 'milestones',
    singularis: 'milestones',
    savannah: 'milestones',
    samaya: 'milestones',
    'royal-romance': 'milestones',
    romea: 'milestones',
    'rock-it': 'milestones',
    revive: 'milestones',
    relentless: 'milestones',
    'r-j': 'milestones',
    'project-1012': 'milestones',
    'project-1011': 'milestones',
    'project-1010': 'milestones',
    'project-1009': 'milestones',
    'project-1008': 'milestones',
    'project-1007': 'milestones',
    'project-1006': 'milestones',
    pilar: 'milestones',
    'najiba-ii': 'milestones',
    najiba: 'milestones',
    madsummer: 'milestones',
    'madame-gu': 'milestones',
    letitia: 'milestones',
    lonian: 'milestones',
    kiss: 'milestones',
    joy: 'milestones',
    jambo: 'milestones',
    halo: 'milestones',
    bliss: 'milestones',
    boardwalk: 'milestones',
    boheme: 'milestones',
    dream: 'milestones',
    drizzle: 'milestones',
    elysian: 'milestones',
    escape: 'milestones',
    eternity: 'milestones',
    // Year tags → milestones
    '2016': 'milestones',
    '2017': 'milestones',
    '2018': 'milestones',
    '2019': 'milestones',
    '2022': 'milestones',
};

// ─────────────────────────────────────────────────────────────────────────────
// Effect Schema Definitions
// ─────────────────────────────────────────────────────────────────────────────
// These schemas provide runtime type validation for data loaded from JSONL files.
// Effect Schema is used instead of Zod for its integration with the Effect library,
// enabling seamless composition with Effect generators for async operations.

/**
 * Schema for author entries extracted from CraftCMS.
 *
 * Authors are matched or created in PayloadCMS's 'people' collection.
 * The schema includes metadata about their article history for reference.
 *
 * @property id - CraftCMS author ID (used for lookup in JSONL cache)
 * @property firstName - Author's first name
 * @property lastName - Author's last name
 * @property title - Author's job title/function (e.g., "Naval Architect")
 * @property picture - URL to author's profile picture
 * @property firstArticleDate - Date of first article authored
 * @property lastArticleDate - Date of most recent article
 * @property articleCount - Total number of articles by this author
 */
type Author = Schema.Schema.Type<typeof Author>;
const Author = Schema.Struct({
    id: Schema.Number,
    firstName: Schema.NullishOr(Schema.String),
    lastName: Schema.NullishOr(Schema.String),
    title: Schema.NullishOr(Schema.String),
    picture: Schema.NullishOr(Schema.String),
    firstArticleDate: Schema.NullishOr(Schema.String),
    lastArticleDate: Schema.NullishOr(Schema.String),
    articleCount: Schema.NullishOr(Schema.Number),
});

/**
 * Schema for CraftCMS article entries.
 *
 * This is the main input schema for the migration task. It represents the full
 * structure of an article exported from CraftCMS, including:
 * - Entry metadata (id, slug, uri, dates)
 * - Content (title, subtitle, summary, contentBlocks)
 * - Relationships (tags, relatedAssets, authorId)
 * - Event data (for event-type articles)
 * - SEO settings
 *
 * ## Content Block Types
 *
 * The `contentBlocks` array can contain various block types:
 * - **Text**: `textContent` field with HTML rich text
 * - **Quote**: `quoteText` and `quoteCitee` fields
 * - **Image**: `media` array with image assets, plus positioning fields
 * - **Gallery**: Multiple images with layout style fields
 * - **Table**: `tableData` JSON with col1/col2 structure
 * - **Video**: JSON media entries with YouTube/Vimeo URLs
 *
 * @property id - CraftCMS entry ID
 * @property elementId - CraftCMS element ID
 * @property slug - URL slug for the article
 * @property uri - Full URI path in CraftCMS
 * @property title - Article title
 * @property subtitle - Optional subtitle
 * @property summary - HTML summary/excerpt
 * @property postDate - Publication date
 * @property contentBlocks - Array of content block entries
 * @property relatedAssets - Cover image and related media
 * @property tags - CraftCMS tags (mapped to taxonomy categories)
 * @property authorId - Reference to author entry
 */
type Article = Schema.Schema.Type<typeof Article>;
const Article = Schema.Struct({
    id: Schema.NullishOr(Schema.Number),
    elementId: Schema.NullishOr(Schema.Number),
    sectionId: Schema.NullishOr(Schema.Number),
    sectionName: Schema.NullishOr(Schema.String),
    sectionHandle: Schema.NullishOr(Schema.String),
    typeId: Schema.NullishOr(Schema.Number),
    typeName: Schema.NullishOr(Schema.String),
    typeHandle: Schema.NullishOr(Schema.String),
    authorId: Schema.NullishOr(Schema.Number),
    author: Schema.NullishOr(
        Schema.Struct({
            firstName: Schema.NullishOr(Schema.String),
            lastName: Schema.NullishOr(Schema.String),
            role: Schema.NullishOr(Schema.String),
            authorSlug: Schema.NullishOr(Schema.String),
        }),
    ),
    slug: Schema.String,
    uri: Schema.String,
    siteId: Schema.Number,
    title: Schema.NullishOr(Schema.String),
    subtitle: Schema.NullishOr(Schema.String),
    summary: Schema.NullishOr(Schema.String),
    postDate: Schema.NullishOr(Schema.Date),
    expiryDate: Schema.NullishOr(Schema.Date),
    dateCreated: Schema.NullishOr(Schema.Date),
    dateUpdated: Schema.NullishOr(Schema.Date),
    eventStart: Schema.NullishOr(Schema.Date),
    eventEnd: Schema.NullishOr(Schema.Date),
    location: Schema.NullishOr(Schema.String),
    seoSettings: Schema.NullishOr(Schema.Any),
    canonicalUrl: Schema.NullishOr(Schema.String),
    publishableContexts: Schema.NullishOr(Schema.Any),
    pin: Schema.NullishOr(Schema.String),
    taxonomy: Schema.NullishOr(Schema.Any),
    mediaTopics: Schema.NullishOr(Schema.Any),
    buildPostMilestone: Schema.NullishOr(Schema.Any),
    buildPostText: Schema.NullishOr(Schema.Any),
    contentBlocks: Schema.NullishOr(
        Schema.Array(Schema.NullishOr(CraftCMSContentBlock)),
    ),
    relatedAssets: Schema.NullishOr(
        Schema.Array(
            Schema.NullishOr(
                Schema.Struct({
                    fieldId: Schema.NullishOr(Schema.Number),
                    targetId: Schema.NullishOr(Schema.Number),
                    sortOrder: Schema.NullishOr(Schema.Number),
                    filename: Schema.NullishOr(Schema.String),
                    kind: Schema.NullishOr(Schema.String),
                    alt: Schema.NullishOr(Schema.String),
                    width: Schema.NullishOr(Schema.String),
                    height: Schema.NullishOr(Schema.String),
                    size: Schema.NullishOr(Schema.Number),
                    focalPoint: Schema.NullishOr(Schema.Any),
                    dateCreated: Schema.NullishOr(Schema.Date),
                }),
            ),
        ),
    ),
    tags: Schema.NullishOr(
        Schema.Array(
            Schema.NullishOr(
                Schema.Struct({
                    tagId: Schema.NullishOr(Schema.Number),
                    slug: Schema.NullishOr(Schema.String),
                    groupId: Schema.NullishOr(Schema.Number),
                    groupName: Schema.NullishOr(Schema.String),
                    groupHandle: Schema.NullishOr(Schema.String),
                    sortOrder: Schema.NullishOr(Schema.Number),
                }),
            ),
        ),
    ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Task Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Log prefix for consistent, searchable log messages */
const SEED_LOG_PREFIX = '[seeding/seedArticleFromCraftCMS]';

/**
 * PayloadCMS task configuration for migrating articles from CraftCMS.
 *
 * This task performs a comprehensive migration of a single article, including:
 * - Content block transformation (text, images, quotes, tables, videos)
 * - Author resolution (find or create in 'people' collection)
 * - Tag to category mapping
 * - Redirect creation from old CraftCMS URIs
 * - Media upload job queuing
 *
 * ## Input Schema
 *
 * - `data` (required): CraftCMS article JSON matching the Article schema
 * - `parentPageId` (required): ID of the news overview page (parent)
 * - `pageTemplateId` (required): ID of the article page template
 *
 * ## Output
 *
 * Returns the created page document, or null if the article already exists.
 *
 * ## Content Block Transformation
 *
 * | CraftCMS Block | PayloadCMS Block | Notes |
 * |---------------|------------------|-------|
 * | Text (textContent) | RichText | HTML → Lexical conversion |
 * | Quote | Quote | With citee attribution |
 * | Single Image | MediaBlock | Queues upload job |
 * | Multiple Images | ImageMarquee | Gallery layout |
 * | YouTube JSON | Youtube | Extracts URL from JSON |
 * | Vimeo JSON | Vimeo | Extracts URL from JSON |
 * | Table | Table | Maps col1/col2 to header/value |
 *
 * ## Error Handling
 *
 * - Retries up to 3 times on failure
 * - Reports failures to Sentry with job context
 * - Skips duplicate articles (by slug)
 * - Logs extensively for debugging
 *
 * @example
 * // Queue an article migration
 * await payload.jobs.queue({
 *     task: 'seedArticleFromCraftCMS',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         data: craftcmsArticleJson,
 *         parentPageId: 'news-overview-page-id',
 *         pageTemplateId: 'article-template-id',
 *     },
 * });
 */
export const seedArticleFromCraftCMSTask: TaskConfig<'seedArticleFromCraftCMS'> =
    {
        slug: 'seedArticleFromCraftCMS',

        // Retry up to 3 times on failure (network issues, API errors)
        retries: 3,

        /**
         * Input schema defining the expected task inputs.
         * - data: The full CraftCMS article JSON
         * - parentPageId: ID of the parent page (news overview)
         * - pageTemplateId: ID of the article template
         */
        inputSchema: [
            {
                name: 'data',
                type: 'json',
                required: true,
            },
            {
                name: 'parentPageId',
                type: 'text',
                required: true,
            },
            {
                name: 'pageTemplateId',
                type: 'text',
                required: true,
            },
        ],

        /**
         * Error handler called when all retries are exhausted.
         * Reports the failure to Sentry for monitoring and alerting,
         * including the full job context and input data for debugging.
         */
        onFail: ({ job, input }) => {
            Sentry.captureException(
                new Error('Seed article from CraftCMS task failed'),
                {
                    extra: {
                        job,
                        input,
                    },
                },
            );
        },

        /**
         * Main task handler that migrates a CraftCMS article to PayloadCMS.
         *
         * ## Processing Flow
         *
         * 1. **Input Validation**: Decode and validate the CraftCMS article data
         * 2. **Deduplication**: Check if article with same slug already exists
         * 3. **Author Resolution**: Find or create the author in 'people' collection
         * 4. **Page Creation**: Create the article page with metadata
         * 5. **Redirect Setup**: Create redirect from old CraftCMS URI
         * 6. **Block Processing**: Transform each content block:
         *    - Text → RichText (HTML to Lexical conversion)
         *    - Quote → Quote block
         *    - Single image → MediaBlock
         *    - Multiple images → ImageMarquee
         *    - JSON media → YouTube/Vimeo blocks
         *    - Table → Table block
         * 7. **Media Upload**: Queue upload jobs for all images
         * 8. **Cover Image**: Queue upload for hero/cover image
         *
         * ## Effect Library Usage
         *
         * The block processing uses Effect generators to:
         * - Normalize sync/async flows in a consistent pattern
         * - Enable parallel processing of image marquee items
         * - Collect upload queue inputs as side effects
         * - Avoid deeply nested Promise chains
         */
        async handler(args) {
            const {
                req: { payload },
            } = args;

            // ─────────────────────────────────────────────────────────────────
            // Initialize Dependencies
            // ─────────────────────────────────────────────────────────────────
            payload.logger.info(`${SEED_LOG_PREFIX} Handler started.`);

            // JSDOM is dynamically imported to avoid bundling issues with Next.js.
            // It's used for parsing HTML content and for Lexical's HTML-to-JSON conversion.
            const JSDOM = await import('jsdom').then((mod) => mod.JSDOM);
            payload.logger.info(`${SEED_LOG_PREFIX} Imported JSDOM.`);

            // ─────────────────────────────────────────────────────────────────
            // Input Validation & Parsing
            // ─────────────────────────────────────────────────────────────────
            // Decode and validate the CraftCMS article data against our schema.
            // The 'onExcessProperty: preserve' option allows unknown fields to
            // pass through, making the migration more resilient to schema changes.
            const input = Schema.decodeUnknownSync(Article, {
                onExcessProperty: 'preserve',
            })(args.input.data);

            payload.logger.info(
                `${SEED_LOG_PREFIX} Decoded input for slug: ${input.slug}`,
            );

            // Map CraftCMS tags to PayloadCMS taxonomy categories using priority order
            const category = mapTagsToCategory(input.tags);
            payload.logger.info(
                `${SEED_LOG_PREFIX} Determined category: ${category ?? 'undefined'}`,
            );
            const slug = formatSlug(input.slug ?? '', 'en');
            payload.logger.info(`${SEED_LOG_PREFIX} Formatted slug: ${slug}`);

            const title = input.title?.replaceAll('_', '') ?? '';
            payload.logger.info(
                `${SEED_LOG_PREFIX} Computed title: '${title}'`,
            );

            // Parse summary HTML to extract plain text for SEO description
            const description = input.summary
                ? new JSDOM(input.summary).window.document.body.textContent ||
                  ''
                : '';
            payload.logger.info(
                `${SEED_LOG_PREFIX} Computed description: '${description.slice(0, 60)}...'`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Author Lookup
            // ─────────────────────────────────────────────────────────────────
            // Prefer the relation-based author (display/byline author) over
            // authorId (CMS entry creator). The relation author comes from the
            // craft_relations table and represents the actual article author.
            const authorData = await findAuthorById(input.authorId);

            payload.logger.info(
                `${SEED_LOG_PREFIX} Fetched authorData for id: ${input.authorId} result: ${authorData ? 'present' : 'null'}`,
            );
            payload.logger.info(
                `${SEED_LOG_PREFIX} Relation author: ${input.author ? `${input.author.firstName} ${input.author.lastName}` : 'null'}`,
            );

            const authorFullName = input.author
                ? [input.author.firstName, input.author.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Feadship'
                : authorData
                  ? [authorData.firstName, authorData.lastName]
                        .filter(Boolean)
                        .join(' ') || 'Feadship'
                  : 'Feadship';

            const authorFunction =
                input.author?.role || authorData?.title || undefined;

            payload.logger.info(
                `${SEED_LOG_PREFIX} Computed authorFullName: '${authorFullName}'`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Deduplication Check
            // ─────────────────────────────────────────────────────────────────
            // Check if an article with this slug already exists to avoid duplicates.
            // We query by both taxonomyType and slug to ensure we only match news articles.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Checking for existing article with slug: ${slug}`,
            );
            const existingArticles = await payload.find({
                collection: 'pages',
                where: {
                    taxonomyType: { equals: 'news' },
                    slug: { equals: slug },
                },
                limit: 1,
            });

            // Skip migration if article already exists (idempotent operation)
            if (existingArticles.totalDocs > 0) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Article with slug ${input.slug} already exists. Skipping.`,
                );
                return { output: null };
            }

            // ─────────────────────────────────────────────────────────────────
            // Cross-Taxonomy Deduplication
            // ─────────────────────────────────────────────────────────────────
            // If a press entry with the same slug exists, delete it.
            // News entries take precedence over press entries for duplicated content.
            const existingPressEntry = await payload.find({
                collection: 'pages',
                where: {
                    taxonomyType: { equals: 'press' },
                    slug: { equals: slug },
                },
                limit: 1,
            });

            if (existingPressEntry.totalDocs > 0) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Slug "${slug}" exists as press entry. Deleting press duplicate.`,
                );
                await payload
                    .delete({
                        collection: 'pages',
                        id: existingPressEntry.docs[0].id,
                    })
                    .catch((error) => {
                        payload.logger.error(
                            `${SEED_LOG_PREFIX} Error deleting press duplicate: ${error}`,
                        );
                    });
            }

            // ─────────────────────────────────────────────────────────────────
            // Lexical Editor Configuration
            // ─────────────────────────────────────────────────────────────────
            // Create the Lexical editor config needed for HTML-to-Lexical conversion.
            // This ensures the converted content matches PayloadCMS's rich text schema.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Preparing editorConfig for lexical conversion.`,
            );
            const editorConfig = await editorConfigFactory.default({
                config: payload.config,
            });
            payload.logger.info(
                `${SEED_LOG_PREFIX} EditorConfig created for slug: ${slug}.`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Author Resolution (People Collection)
            // ─────────────────────────────────────────────────────────────────
            // Find or create the author in PayloadCMS's 'people' collection.
            // Authors are matched by full name to avoid duplicates.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Attempting to find author: '${authorFullName}' in people collection.`,
            );
            let author: Person | null | undefined = await payload
                .find({
                    collection: 'people',
                    where: {
                        name: { equals: authorFullName },
                    },
                    limit: 1,
                })
                .then(({ docs }) => docs.at(0));

            if (!author && authorFullName) {
                payload.logger.info(
                    `${SEED_LOG_PREFIX} Author not found, creating Person with name: '${authorFullName}' and function: '${authorFunction}'.`,
                );
            }
            author ??= authorFullName
                ? await payload.create({
                      collection: 'people',
                      data: {
                          name: authorFullName,
                          function: authorFunction,
                      },
                  })
                : null;
            payload.logger.info(
                `${SEED_LOG_PREFIX} Final author resolved: ${
                    author ? (author.name ?? '[no name]') : 'null'
                }`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Article Creation (Without Blocks)
            // ─────────────────────────────────────────────────────────────────
            // Create the article page first WITHOUT blocks. Blocks are added in a
            // subsequent update because we need the document ID for media upload
            // queue paths (e.g., 'blocks.0.media.image.media').
            payload.logger.info(
                `${SEED_LOG_PREFIX} Creating article with slug: ${slug}`,
            );
            const createdArticle = await payload.create({
                collection: 'pages',
                data: {
                    meta: {
                        title,
                        description,
                    },
                    publishedAt: input.postDate?.toISOString(),
                    _status: 'published',
                    title,
                    slug,
                    taxonomyType: 'news',
                    taxonomyData: {
                        news: {
                            author,
                            description,
                            category: category ? [category] : [],
                        },
                    },
                    template: args.input.pageTemplateId,
                    parent: args.input.parentPageId,
                },
            });

            payload.logger.info(
                `${SEED_LOG_PREFIX} Article created with id: ${createdArticle.id}`,
            );

            // ─────────────────────────────────────────────────────────────────
            // Redirect Setup
            // ─────────────────────────────────────────────────────────────────
            // Create a 308 (Permanent Redirect) from the old CraftCMS URI to the
            // new PayloadCMS page. This preserves SEO and ensures old links work.
            // First, remove any existing redirect for this URI to avoid conflicts.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Removing any existing redirect from uri: ${input.uri}`,
            );
            await payload.delete({
                collection: 'redirects',
                where: {
                    from: { equals: input.uri },
                },
            });
            payload.logger.info(
                `${SEED_LOG_PREFIX} Old redirects deleted for uri: ${input.uri}`,
            );

            // Create the redirect from old CraftCMS URI to the new page
            payload.logger.info(
                `${SEED_LOG_PREFIX} Creating redirect from old uri: ${input.uri} to page id: ${createdArticle.id}`,
            );
            await payload
                .create({
                    collection: 'redirects',
                    data: {
                        from: input.uri,
                        to: {
                            type: 'reference',
                            reference: {
                                relationTo: 'pages',
                                value: createdArticle.id,
                            },
                        },
                        type: '308',
                    },
                })
                .then(() => {
                    payload.logger.info(
                        `${SEED_LOG_PREFIX} Redirect created from: ${input.uri} to page id: ${createdArticle.id}`,
                    );
                })
                .catch((error) => {
                    payload.logger.error(
                        `${SEED_LOG_PREFIX} Error creating redirect from: ${input.uri} to page id: ${createdArticle.id} - ${error}`,
                    );
                    return null;
                });

            // ─────────────────────────────────────────────────────────────────
            // Content Block Processing
            // ─────────────────────────────────────────────────────────────────
            // Use shared content block processing function to transform CraftCMS
            // content blocks into PayloadCMS blocks. Note: Articles don't use
            // the introduction field (press entries do).
            const { blocks, uploadQueueInput } = await processContentBlocks({
                payload,
                documentId: createdArticle.id,
                contentBlocks: input.contentBlocks,
                editorConfig,
                JSDOM,
                logPrefix: SEED_LOG_PREFIX,
                extractIntroduction: false,
            });

            // ─────────────────────────────────────────────────────────────────
            // Update Article with Blocks
            // ─────────────────────────────────────────────────────────────────
            // Now that we have the blocks (with placeholder media fields), update
            // the article. The media fields will be populated by the upload queue jobs.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Updating article with blocks, page id: ${createdArticle.id}.`,
            );
            await payload
                .update({
                    collection: 'pages',
                    id: createdArticle.id,
                    data: {
                        blocks,
                    },
                })
                .then(() => {
                    payload.logger.info(
                        `${SEED_LOG_PREFIX} Blocks updated on article ${createdArticle.id}`,
                    );
                })
                .catch((error) => {
                    payload.logger.error(
                        { blocks },
                        `${SEED_LOG_PREFIX} Error adding blocks to article: ${error}`,
                    );
                });

            // ─────────────────────────────────────────────────────────────────
            // Queue Content Block Media Uploads
            // ─────────────────────────────────────────────────────────────────
            // Queue all the media upload jobs collected during block processing.
            // These run on the 'media-sync' queue and will update the article's
            // block fields with the uploaded media references.
            payload.logger.info(
                `${SEED_LOG_PREFIX} Queueing media upload jobs. Total items: ${uploadQueueInput.length}`,
            );

            await Promise.all(
                uploadQueueInput.map((input) =>
                    payload.jobs
                        .queue({
                            task: 'createUploadFromUrl',
                            queue: 'media-sync',
                            input,
                        })
                        .then(() => {
                            payload.logger.info(
                                `${SEED_LOG_PREFIX} Media upload job queued for url: ${input.url}`,
                            );
                        }),
                ),
            );

            // ─────────────────────────────────────────────────────────────────
            // Cover Image Upload
            // ─────────────────────────────────────────────────────────────────
            // Extract the cover/hero image from relatedAssets and queue its upload.
            // The cover image is stored at 'taxonomyData.news.cover.media'.
            // Uses Effect's Option type for safe null handling.
            const coverImage = Option.fromNullable(
                input.relatedAssets?.find(
                    (asset) => asset?.kind === 'image' && !!asset?.filename,
                ),
            );

            payload.logger.info(
                `${SEED_LOG_PREFIX} Selected coverImage: ${
                    Option.isSome(coverImage)
                        ? `filename: ${Option.getOrThrow(coverImage).filename}`
                        : 'none'
                }`,
            );

            // I did not find a reliable way to get the CDN URL from craft db,
            // so we're checking both known paths.
            const cdnUrlCandidates = pipe(
                coverImage,
                Option.map((asset) => [
                    new URL(
                        `/craft/media/images/${asset.filename}`,
                        S3_AMAZONAWS_URL,
                    ).href,
                    new URL(
                        `/craft/yachts/images/${asset.filename}`,
                        S3_AMAZONAWS_URL,
                    ).href,
                ]),
            );

            payload.logger.info(
                `${SEED_LOG_PREFIX} Computed cloudFrontUrls: ${
                    Option.isSome(cdnUrlCandidates)
                        ? Option.getOrThrow(cdnUrlCandidates).join(', ')
                        : 'none'
                }`,
            );

            // Queue hero image upload if available
            if (Option.isSome(cdnUrlCandidates)) {
                const urls = Option.getOrThrow(cdnUrlCandidates);

                let url: string | undefined;
                for (const candidateUrl of urls) {
                    try {
                        // Only perform a HEAD request to avoid downloading the binary data
                        const res = await fetch(candidateUrl, {
                            method: 'HEAD',
                        });
                        if (res.ok) {
                            url = candidateUrl;
                            break;
                        }
                    } catch (e) {
                        payload.logger.warn(
                            `${SEED_LOG_PREFIX} Error checking url: ${candidateUrl} - ${e}`,
                        );
                    }
                }

                if (!url) {
                    payload.logger.warn(
                        `${SEED_LOG_PREFIX} No available cover image URLs responded with 200. Skipping hero image. URLs checked: ${urls.join(', ')}`,
                    );
                } else {
                    payload.logger.info(
                        `${SEED_LOG_PREFIX} Creating hero image for article ${createdArticle.id}`,
                    );

                    const existingMedia = await payload
                        .find({
                            collection: 'media',
                            where: {
                                source: { equals: url },
                            },
                        })
                        .then((x) => x.docs.at(0));

                    if (existingMedia) {
                        payload.logger.info(
                            `${SEED_LOG_PREFIX} Media already exists for url: ${url}. Assigning existing media and skipping upload.`,
                        );
                        await payload.update({
                            collection: 'pages',
                            id: createdArticle.id,
                            data: {
                                taxonomyData: {
                                    news: {
                                        cover: { media: existingMedia },
                                    },
                                },
                            },
                        });
                    } else {
                        await payload.jobs.queue({
                            task: 'createUploadFromUrl',
                            queue: 'media-sync',
                            input: {
                                url,
                                target: {
                                    collection: 'pages',
                                    doc: createdArticle.id,
                                    path: 'taxonomyData.news.cover.media',
                                },
                            },
                        });
                    }

                    payload.logger.info(
                        `${SEED_LOG_PREFIX} Hero image upload job queued for article ${createdArticle.id}`,
                    );
                }
            }

            // Done
            payload.logger.info(
                `${SEED_LOG_PREFIX} Done. Created article with slug: ${createdArticle.slug}`,
            );

            return {
                output: createdArticle,
            };
        },
    };

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps CraftCMS tags to PayloadCMS taxonomy categories.
 *
 * CraftCMS articles can have multiple tags, but PayloadCMS uses a single
 * category per article. This function:
 * 1. Maps each tag slug to its corresponding category using TAG_TO_TAXONOMY_MAP
 * 2. Returns the highest-priority matching category
 *
 * The priority order ensures that more significant categories (like 'milestones'
 * for launches and anniversaries) take precedence over more generic ones.
 *
 * @param tags - Array of CraftCMS tag objects with slug properties
 * @returns The highest-priority matching category, or undefined if no match
 *
 * @example
 * // Article with multiple tags
 * mapTagsToCategory([{ slug: 'launch' }, { slug: 'innovation' }])
 * // Returns: 'milestones' (higher priority than 'innovation')
 */
function mapTagsToCategory(
    tags: Article['tags'],
): keyof typeof NEWS_TAXONOMY_CATEGORIES | undefined {
    if (!tags || tags.length === 0) return undefined;

    // Priority order determines which category wins when multiple tags match
    // milestones → innovation → sustainability → design → crafting → perspectives → events
    const priorityOrder: (keyof typeof NEWS_TAXONOMY_CATEGORIES)[] = [
        'milestones',
        'innovation',
        'sustainability',
        'design',
        'crafting',
        'perspectives',
        'events',
    ];

    const tagSlugs = tags.map((t) => t?.slug).filter(Boolean) as string[];
    const matchedCategories = new Set<keyof typeof NEWS_TAXONOMY_CATEGORIES>();

    // Map all tags to categories
    for (const slug of tagSlugs) {
        const category = TAG_TO_TAXONOMY_MAP[slug];
        if (category) {
            matchedCategories.add(category);
        }
    }

    // Return first matching category based on priority
    for (const category of priorityOrder) {
        if (matchedCategories.has(category)) {
            return category;
        }
    }

    return undefined;
}

/**
 * Loads the authors JSONL file into memory.
 *
 * Similar to loadContentBlockMedia(), this function implements a module-level
 * cache for author data. Authors are extracted from CraftCMS and used to
 * create or match Person records in PayloadCMS.
 *
 * @returns A Map keyed by author ID for O(1) lookup
 */
async function loadAuthors(): Promise<Map<number, Author>> {
    // Return cached data if already loaded
    if (authorsCache) {
        return authorsCache;
    }

    const authorMap = new Map<number, Author>();

    // Return empty map if file doesn't exist (graceful degradation)
    if (!fs.existsSync(AUTHORS_FILE)) {
        console.warn(
            `${SEED_LOG_PREFIX} Authors file not found: ${AUTHORS_FILE}`,
        );
        authorsCache = authorMap;
        return authorMap;
    }

    // Stream the file line-by-line for memory efficiency
    const fileStream = fs.createReadStream(AUTHORS_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity, // Handle Windows CRLF line endings
    });

    // Parse each line as JSON and validate against schema
    for await (const line of rl) {
        try {
            const parsed = JSON.parse(line);
            const author = Schema.decodeUnknownSync(Author, {
                onExcessProperty: 'preserve',
            })(parsed);
            if (author.id) {
                authorMap.set(author.id, author);
            }
        } catch {
            // Skip invalid lines (malformed JSON or schema validation failures)
        }
    }

    authorsCache = authorMap;
    return authorMap;
}

/**
 * Finds an author entry by their CraftCMS ID.
 *
 * Used during article migration to resolve the author reference and
 * construct the full name for PayloadCMS's Person collection lookup.
 *
 * @param authorId - The CraftCMS author ID
 * @returns The Author entry with name/title information, or null if not found
 *
 * @example
 * const author = await findAuthorById(42);
 * if (author) {
 *     const fullName = `${author.firstName} ${author.lastName}`;
 * }
 */
async function findAuthorById(
    authorId: number | null | undefined,
): Promise<Author | null> {
    if (authorId == null) {
        return null;
    }

    const authorMap = await loadAuthors();
    return authorMap.get(authorId) ?? null;
}

/**
 * Clears the authors cache.
 * Useful for testing scenarios where you need to reload the JSONL file,
 * or for long-running processes that need to free memory.
 * @internal
 */
function _clearAuthorsCache(): void {
    authorsCache = null;
}
