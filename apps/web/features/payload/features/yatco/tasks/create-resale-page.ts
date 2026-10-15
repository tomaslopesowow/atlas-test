/**
 * @module createResalePage
 *
 * This module provides a PayloadCMS background task for creating resale vessel pages
 * from YATCO data. It acts as the "Tier 2" task in the resale sync pipeline,
 * handling individual vessel page creation with broker priority logic.
 *
 * ## Architecture
 *
 * The resale synchronization follows a three-stage pipeline:
 *
 * ```
 * ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │ syncYatcoResale  │────▶│ createResalePage │────▶│createUploadFromUrl│
 * │  (Orchestrator)  │     │  (Page Creator)  │     │ (Media Handler)  │
 * └──────────────────┘     └──────────────────┘     └──────────────────┘
 *       nightly              taxonomy-sync            media-sync
 *        queue                   queue                  queue
 *                                  ↑
 *                            This task
 * ```
 *
 * This task is queued by `syncYatcoResale` for each vessel that needs a page created.
 *
 * ## Key Features
 *
 * - **Page Deduplication:** Checks by hull ID to prevent duplicate pages
 * - **Broker Priority:** Feadship-brokered listings take precedence over third-party
 * - **Slug Collision Handling:** Appends numbers to slugs when duplicates exist
 * - **Media Queue:** Queues cover image upload as separate job
 * - **Parent Page Assignment:** Places pages under the resale overview page
 *
 * ## Broker Priority Logic
 *
 * When a vessel page already exists:
 * 1. If existing page is Feadship-brokered → keep it, skip new listing
 * 2. If existing page is third-party but new listing is Feadship → replace it
 * 3. If both are same broker type → keep existing
 *
 * This ensures Feadship's own listings are always preferred.
 *
 * ## Usage
 *
 * Typically queued by `syncYatcoResale`, but can be manually triggered:
 *
 * ```typescript
 * await payload.jobs.queue({
 *     task: 'createResalePage',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         yatcoVesselId: '12345',
 *     },
 * });
 * ```
 */

import type { TaskConfig } from 'payload';
import { RESALE_TEMPLATE_TITLE } from '@/features/payload/collections/page-templates';
import { formatSlug } from '@/features/payload/fields/slug/formatSlug';
import { YATCO_FEADSHIP_BROKER_ID } from '../shared';
import { getYatcoClient } from '../utils/yatco-client';
import { Vessel } from '../utils/yatco-client';
import {
    findYachtByYatcoId,
    resolveYachtImageUrl,
    type YachtData,
} from '../../devoogt/utils/yacht-data-loader';
import { RESALE_ABOUT_EDITOR_CONFIG } from '../../taxonomies/taxonomies';
import {
    convertHTMLToLexical,
    editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import type { Page } from '@/payload-types';
import * as Sentry from '@sentry/nextjs';
import { Schema } from 'effect';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { findBrokerByVesselId } from '../utils/find-broker-by-vessel-id';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Log prefix for consistent, searchable log messages */
const LOG_PREFIX = '[yatco/createResalePage]';

/**
 * Path to the CraftCMS yacht data JSONL file.
 * This file contains yacht records extracted from CraftCMS, including hull numbers
 * that are used to override potentially incorrect hull IDs from YATCO API.
 */
const CRAFTCMS_YACHTS_FILE = path.join(
    process.cwd(),
    'seed/craftcms/unique-yachts.jsonl',
);

/**
 * Hardcoded yacht name to hull ID mappings for edge cases.
 * These are vessels that cannot be reliably matched through the normal matching strategies
 * due to data inconsistencies, special characters, or other issues.
 *
 * Key: Vessel name (case-insensitive matching will be applied)
 * Value: Hull ID
 */
const HARDCODED_YACHT_HULL_MAPPINGS = new Map<string, string>([
    ['Sissi', '584'],
]);

// ─────────────────────────────────────────────────────────────────────────────
// JSONL Data Loading & Caching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Module-level cache for CraftCMS yacht data loaded from JSONL.
 * Prevents redundant file reads when processing multiple vessels.
 * Keyed by hull number (string) for O(1) lookup.
 */
let craftcmsYachtsCache: Map<string, CraftCMSYachtData> | null = null;

/**
 * Schema for yacht data extracted from CraftCMS.
 * Represents the structure of yacht records in the unique-yachts.jsonl file.
 *
 * @property id - CraftCMS yacht entry ID
 * @property slug - URL-safe yacht identifier
 * @property title - Yacht launch name or title
 * @property hullNumber - Feadship hull number (the authoritative source)
 * @property currentName - Current yacht name (may differ from launch name)
 * @property previousNames - Previous names the yacht has had
 * @property thirdPartyData - Array containing third-party data from multiple sources:
 *   - DVDB (De Voogt DB): Contains hull, launch_name, current_name
 *   - yatco: Contains VesselName (often in different case)
 *   - 7SEAS: Other data source
 */
type CraftCMSYachtData = Schema.Schema.Type<typeof CraftCMSYachtData>;
const CraftCMSYachtData = Schema.Struct({
    id: Schema.Number,
    slug: Schema.String,
    title: Schema.NullishOr(Schema.String),
    hullNumber: Schema.NullishOr(Schema.String),
    currentName: Schema.NullishOr(Schema.String),
    previousNames: Schema.NullishOr(Schema.String),
    thirdPartyData: Schema.NullishOr(
        Schema.Array(
            Schema.Struct({
                sourceType: Schema.String,
                content: Schema.parseJson(Schema.Unknown),
            }),
        ),
    ),
});

/**
 * Loads CraftCMS yacht data from the JSONL file and caches it in memory.
 * The data is indexed by hull number for fast lookups when matching YATCO vessels.
 *
 * @returns Map of hull numbers to CraftCMS yacht data records
 */
async function loadCraftCMSYachts(): Promise<Map<string, CraftCMSYachtData>> {
    // Return cached data if already loaded
    if (craftcmsYachtsCache) return craftcmsYachtsCache;

    const yachtMap = new Map<string, CraftCMSYachtData>();

    try {
        const fileStream = fs.createReadStream(CRAFTCMS_YACHTS_FILE);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            try {
                const parsed = JSON.parse(line);
                const yacht = Schema.decodeUnknownSync(CraftCMSYachtData, {
                    onExcessProperty: 'preserve',
                })(parsed);

                // Index by hull number if available
                if (yacht.hullNumber) {
                    yachtMap.set(yacht.hullNumber, yacht);
                }

                // Also index by De Voogt hull number if available from third-party data
                if (yacht.thirdPartyData) {
                    for (const thirdParty of yacht.thirdPartyData) {
                        const data = thirdParty.content;

                        // Skip if content is not an object (e.g., empty array)
                        if (
                            !data ||
                            typeof data !== 'object' ||
                            Array.isArray(data)
                        ) {
                            continue;
                        }

                        // Index by hull number from DVDB data
                        if ('hull' in data && typeof data.hull === 'number') {
                            yachtMap.set(String(data.hull), yacht);
                        }
                    }
                }
            } catch {
                // Skip invalid lines (malformed JSON or schema validation failures)
            }
        }

        craftcmsYachtsCache = yachtMap;
    } catch (error) {
        // If file doesn't exist or can't be read, return empty map
        console.warn(
            `${LOG_PREFIX} Could not load yachts file at ${CRAFTCMS_YACHTS_FILE}:`,
            error,
        );
        craftcmsYachtsCache = new Map();
    }

    return yachtMap;
}

/**
 * Normalizes a string for fuzzy name matching.
 * Converts to lowercase and removes special characters, keeping only alphanumerics.
 *
 * @param str - The string to normalize
 * @returns Normalized string (lowercase, alphanumeric only)
 *
 * @example
 * normalizeForMatching("Lady-Anne III") // "ladyanneiii"
 */
function normalizeForMatching(str: string | null | undefined): string {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts all previous names from a CraftCMS yacht record.
 * Previous names can be in two formats:
 * 1. CraftCMS previousNames: JSON string like '[{"col1":"Name1"},{"col1":"Name2"}]'
 * 2. DVDB previous_names: Comma-separated string like "Name1, Name2, Name3"
 *
 * @param yacht - The CraftCMS yacht data
 * @returns Array of all previous names (deduplicated)
 */
function extractPreviousNames(yacht: CraftCMSYachtData): string[] {
    const names = new Set<string>();

    // Extract from CraftCMS previousNames field (JSON array)
    if (yacht.previousNames) {
        try {
            const parsed = JSON.parse(yacht.previousNames);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (item?.col1 && typeof item.col1 === 'string') {
                        names.add(item.col1.trim());
                    }
                }
            }
        } catch {
            // Not valid JSON, might be a plain string
            // Try splitting by comma as fallback
            const parts = yacht.previousNames.split(',');
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed) names.add(trimmed);
            }
        }
    }

    // Extract from DVDB previous_names field (comma-separated)
    if (yacht.thirdPartyData) {
        for (const thirdParty of yacht.thirdPartyData) {
            const data = thirdParty.content;

            // Skip if content is not an object (e.g., empty array from 7SEAS)
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                continue;
            }

            // Check if previous_names field exists and is a string
            if (
                'previous_names' in data &&
                typeof data.previous_names === 'string'
            ) {
                const parts = data.previous_names.split(',');
                for (const part of parts) {
                    const trimmed = part.trim();
                    if (trimmed) names.add(trimmed);
                }
            }
        }
    }

    return Array.from(names);
}

/**
 * Finds a CraftCMS yacht record that matches the given YATCO vessel.
 *
 * Yachts often have both a launch name (original name) and a current name (if renamed).
 * This function checks both names from multiple sources to find the best match.
 *
 * Uses multiple matching strategies in priority order:
 * 0. **Hardcoded mappings** - Edge cases with known hull IDs
 * 1. **Hull number match** - Most reliable, direct hull ID comparison
 * 2. **Exact name match** - Vessel name matches current name, launch name, or title
 * 3. **Slug match** - Formatted slug comparison
 * 4. **Fuzzy name match** - Normalized name comparison (handles variations)
 *
 * @param vessel - The YATCO vessel data to match
 * @param slug - The formatted slug for the vessel
 * @returns The matching CraftCMS yacht data, or null if no match found
 */
async function findCraftCMSYachtForYatcoVessel(
    vessel: Vessel,
    slug: string,
): Promise<CraftCMSYachtData | null> {
    const yachtMap = await loadCraftCMSYachts();
    const vesselName = vessel.Description?.VesselName;

    // Strategy 0: Check hardcoded mappings for edge cases
    // These are vessels with known data issues that need manual mapping
    if (vesselName) {
        const vesselNameLower = vesselName.toLowerCase();
        for (const [mappedName, hullId] of HARDCODED_YACHT_HULL_MAPPINGS) {
            if (mappedName.toLowerCase() === vesselNameLower) {
                const byHardcodedHull = yachtMap.get(hullId);
                if (byHardcodedHull) {
                    return byHardcodedHull;
                }
            }
        }
    }

    // Strategy 1: Match by hull number from YATCO
    if (vessel.HullDeck?.HullID) {
        const byHull = yachtMap.get(vessel.HullDeck.HullID);
        if (byHull) {
            return byHull;
        }
    }

    // Convert map to array for name/slug matching
    const yachts = Array.from(yachtMap.values());

    // Strategy 2: Match by exact name (case-insensitive)
    // Check against current name, launch name, and previous names from all sources
    if (vesselName) {
        const vesselNameLower = vesselName.toLowerCase();
        const byExactName = yachts.find((y) => {
            try {
                // CraftCMS fields (case-insensitive)
                if (y.currentName?.toLowerCase() === vesselNameLower)
                    return true;
                if (y.title?.toLowerCase() === vesselNameLower) return true; // title is typically the launch name

                // Check previous names (e.g., "Lady Marina" might be a previous name)
                try {
                    const previousNames = extractPreviousNames(y);
                    for (const prevName of previousNames) {
                        if (prevName.toLowerCase() === vesselNameLower)
                            return true;
                    }
                } catch {
                    // Skip previous names check if extraction fails
                }

                // Check all third-party data sources (DVDB, yatco, 7SEAS, etc.)
                if (y.thirdPartyData) {
                    for (const thirdParty of y.thirdPartyData) {
                        const data = thirdParty.content;

                        // Skip if content is not an object (e.g., empty array from 7SEAS)
                        if (
                            !data ||
                            typeof data !== 'object' ||
                            Array.isArray(data)
                        ) {
                            continue;
                        }

                        // DVDB fields
                        if (
                            'current_name' in data &&
                            typeof data.current_name === 'string' &&
                            data.current_name.toLowerCase() === vesselNameLower
                        )
                            return true;
                        if (
                            'launch_name' in data &&
                            typeof data.launch_name === 'string' &&
                            data.launch_name.toLowerCase() === vesselNameLower
                        )
                            return true;

                        // yatco fields (e.g., "BOARDWALK" should match "Boardwalk")
                        if (
                            'VesselName' in data &&
                            typeof data.VesselName === 'string' &&
                            data.VesselName.toLowerCase() === vesselNameLower
                        )
                            return true;
                    }
                }

                return false;
            } catch {
                // If any error occurs for this yacht, skip it and continue
                return false;
            }
        });
        if (byExactName) return byExactName;
    }

    // Strategy 3: Match by slug
    const bySlug = yachts.find((y) => y.slug === slug);
    if (bySlug) return bySlug;

    // Strategy 4: Fuzzy normalized name matching
    // Check current, launch, and previous names with normalization (removes special chars, lowercase)
    if (vesselName) {
        const normalizedVesselName = normalizeForMatching(vesselName);
        const byFuzzyName = yachts.find((y) => {
            try {
                // CraftCMS fields - normalized
                if (
                    normalizeForMatching(y.currentName) === normalizedVesselName
                )
                    return true;
                if (normalizeForMatching(y.title) === normalizedVesselName)
                    return true;

                // Check previous names - normalized
                try {
                    const previousNames = extractPreviousNames(y);
                    for (const prevName of previousNames) {
                        if (
                            normalizeForMatching(prevName) ===
                            normalizedVesselName
                        )
                            return true;
                    }
                } catch {
                    // Skip previous names check if extraction fails
                }

                // Check all third-party data sources - normalized
                if (y.thirdPartyData) {
                    for (const thirdParty of y.thirdPartyData) {
                        const data = thirdParty.content;

                        // Skip if content is not an object (e.g., empty array from 7SEAS)
                        if (
                            !data ||
                            typeof data !== 'object' ||
                            Array.isArray(data)
                        ) {
                            continue;
                        }

                        // DVDB fields
                        if (
                            'current_name' in data &&
                            typeof data.current_name === 'string' &&
                            normalizeForMatching(data.current_name) ===
                                normalizedVesselName
                        )
                            return true;
                        if (
                            'launch_name' in data &&
                            typeof data.launch_name === 'string' &&
                            normalizeForMatching(data.launch_name) ===
                                normalizedVesselName
                        )
                            return true;

                        // yatco fields
                        if (
                            'VesselName' in data &&
                            typeof data.VesselName === 'string' &&
                            normalizeForMatching(data.VesselName) ===
                                normalizedVesselName
                        )
                            return true;
                    }
                }

                return false;
            } catch {
                // If any error occurs for this yacht, skip it and continue
                return false;
            }
        });
        if (byFuzzyName) return byFuzzyName;
    }

    return null;
}

/**
 * Extracts the "about" HTML content from a CraftCMS yacht's DVDB third-party data.
 *
 * The DVDB data is stored in the thirdPartyData array with sourceType 'DVDB'.
 * The content field is a JSON string containing an object with an optional 'about' field.
 *
 * @param yachtData - The CraftCMS yacht data
 * @returns The about HTML string, or null if not found
 */
function extractDvdbAboutContent(yachtData: YachtData | null): string | null {
    if (!yachtData?.thirdPartyData) return null;

    // Find the DVDB entry in thirdPartyData
    const dvdbEntry = yachtData.thirdPartyData.find(
        (entry) => entry.sourceType === 'DVDB',
    );

    if (!dvdbEntry) return null;

    // The content field structure depends on how it was parsed
    // It could be an object (if parsed) or we need to access it directly
    const content = dvdbEntry.content;

    // Content is already parsed by the YachtData schema
    // Check if it's an object with an 'about' field
    if (content && typeof content === 'object' && !Array.isArray(content)) {
        const dvdbContent = content as Record<string, unknown>;
        if ('about' in dvdbContent && typeof dvdbContent.about === 'string') {
            return dvdbContent.about;
        }
    }

    return null;
}

/**
 * PayloadCMS task configuration for creating resale vessel pages from YATCO data.
 *
 * This task creates individual resale pages for vessels, with broker priority logic
 * to ensure Feadship-brokered listings take precedence.
 *
 * ## Input Schema
 *
 * - `yatcoVesselId` (optional): The YATCO vessel ID to create a page for
 *
 * ## Output
 *
 * Returns `{ success: true, pageId: string }` on completion.
 *
 * ## Page Structure
 *
 * Created pages have:
 * - `taxonomyType`: 'resale'
 * - `taxonomyData.resale.hullId`: The hull ID for deduplication
 * - `taxonomyData.resale.yatcoVesselId`: The YATCO vessel ID
 * - `taxonomyData.resale.yatcoBroker`: The broker (Feadship preferred)
 * - `taxonomyData.resale.cover.media`: Cover image (populated by media-sync job)
 * - `parent`: Reference to the resale overview page
 * - `template`: Reference to the resale page template
 *
 * @example
 * // Queue a resale page creation
 * await payload.jobs.queue({
 *     task: 'createResalePage',
 *     queue: 'taxonomy-sync',
 *     input: {
 *         yatcoVesselId: '12345',
 *     },
 * });
 */
export const createResalePageTask: TaskConfig<'createResalePage'> = {
    slug: 'createResalePage',

    // Retry up to 3 times on failure (API unavailability, network issues)
    retries: 3,

    /**
     * Input schema defining the expected task inputs.
     * The yatcoVesselId identifies which vessel to create a page for.
     */
    inputSchema: [
        {
            name: 'yatcoVesselId',
            type: 'text',
        },
    ],

    /**
     * Error handler called when all retries are exhausted.
     * Reports the failure to Sentry for monitoring and alerting.
     */
    onFail: ({ job, input }) => {
        Sentry.captureException(new Error('Create resale page task failed'), {
            extra: {
                job,
                input,
            },
        });
    },

    /**
     * Main task handler that creates a resale page for a vessel.
     *
     * The handler follows this flow:
     * 1. Validate the vessel ID input
     * 2. Fetch vessel details from YATCO API
     * 3. Find the resale overview page (parent) and page template
     * 4. Check for existing page with same hull ID (deduplication)
     * 5. Apply broker priority logic (Feadship takes precedence)
     * 6. Check for slug collisions and increment if needed
     * 7. Create the page with taxonomy data
     * 8. Queue cover image upload job
     */
    async handler(args) {
        const {
            req: { payload },
        } = args;

        // ─────────────────────────────────────────────────────────────────
        // Initialize API Client
        // ─────────────────────────────────────────────────────────────────
        const yatcoClient = await getYatcoClient(payload);
        const vesselId = args.input.yatcoVesselId;

        // ─────────────────────────────────────────────────────────────────
        // Input Validation
        // ─────────────────────────────────────────────────────────────────
        // The vessel ID is required to identify which vessel to process
        if (!vesselId) {
            payload.logger.warn(`${LOG_PREFIX} Vessel ID is required.`);
            throw new Error('Vessel ID is required');
        }

        // ─────────────────────────────────────────────────────────────────
        // Fetch Vessel Details
        // ─────────────────────────────────────────────────────────────────
        // Query the YATCO API for the full vessel record
        // Fetch vessel details and gallery concurrently
        const [vessel, vesselGallery] = await Promise.all([
            yatcoClient?.ForSale.Vessel.byID({
                vesselId: String(vesselId),
            }),
            yatcoClient.ForSale.Gallery({
                vesselId: String(vesselId),
            }),
        ]);

        // Validate vessel data - we need VesselID for proper processing
        if (vessel == null || vessel.Info?.VesselID == null) {
            payload.logger.error(
                `${LOG_PREFIX} Vessel with ID ${vesselId} not found`,
            );
            throw new Error(`Vessel with ID ${vesselId} not found`);
        }

        // ─────────────────────────────────────────────────────────────────
        // Find Resale Overview Page (Parent)
        // ─────────────────────────────────────────────────────────────────
        // All resale pages are children of the resale overview page,
        // which is configured in the global settings.
        const resalePage = await payload
            .findGlobal({
                slug: 'settings',
                depth: 0,
            })
            .then((x) => x.pages?.resale);

        if (!resalePage) {
            throw new Error(`Resale overview page does not exist.`);
        }

        // ─────────────────────────────────────────────────────────────────
        // Find Page Template
        // ─────────────────────────────────────────────────────────────────
        // Look up the resale page template by its title. This template
        // defines the structure and layout for resale vessel pages.
        const pageTemplate = await payload
            .find({
                collection: 'page-templates',
                where: {
                    title: {
                        equals: RESALE_TEMPLATE_TITLE,
                    },
                },
                limit: 1,
            })
            .then(({ docs }) => docs.at(0));

        if (!pageTemplate) {
            throw new Error(
                `Resale page template with title ${RESALE_TEMPLATE_TITLE} not found.`,
            );
        }

        payload.logger.info(
            `${LOG_PREFIX} Processing vessel with ID ${vesselId}`,
        );

        // ─────────────────────────────────────────────────────────────────
        // Prepare Page Title & Slug
        // ─────────────────────────────────────────────────────────────────
        // Use the vessel name if available, otherwise fall back to vessel ID
        const title = vessel.Description?.VesselName || String(vesselId);
        let slug = formatSlug(title);

        payload.logger.info(
            `${LOG_PREFIX} Prepared title: "${title}" and slug: "${slug}"`,
        );

        // ─────────────────────────────────────────────────────────────────
        // CraftCMS Yacht Matching
        // ─────────────────────────────────────────────────────────────────
        // Try to find a matching yacht in CraftCMS data to get the correct hull number.
        // YATCO hull IDs are often incorrect, so we prefer CraftCMS hull numbers.
        payload.logger.info(
            `${LOG_PREFIX} Looking up yacht in CraftCMS data (vessel: "${vessel.Description?.VesselName}", slug: "${slug}")`,
        );

        const craftcmsYacht = await findCraftCMSYachtForYatcoVessel(
            vessel,
            slug,
        );

        let hullId: string;

        if (craftcmsYacht?.hullNumber) {
            hullId = craftcmsYacht.hullNumber;
            payload.logger.info(
                `${LOG_PREFIX} Found matching CraftCMS yacht (id: ${craftcmsYacht.id}, title: "${craftcmsYacht.title}"). Using CraftCMS hull number: "${hullId}"`,
            );
        } else {
            // Fall back to YATCO hull ID with a warning
            hullId = vessel.HullDeck?.HullID ?? 'UNKNOWN';
            payload.logger.warn(
                `${LOG_PREFIX} No matching yacht found in CraftCMS data. Using potentially incorrect YATCO hull ID: "${hullId}"`,
            );
        }

        payload.logger.info(
            `${LOG_PREFIX} Final hull ID determined: "${hullId}"`,
        );

        // ─────────────────────────────────────────────────────────────────
        // Slug Collision Detection
        // ─────────────────────────────────────────────────────────────────
        // Check for existing pages with the same title or slug. If found,
        // append a number to make the slug unique.
        payload.logger.info(
            `${LOG_PREFIX} Checking for slug collisions for: "${slug}"`,
        );

        const duplicates = await payload.find({
            collection: 'pages',
            where: {
                taxonomyType: { equals: 'resale' },
                slug: { equals: slug },
            },
        });

        // Append number to slug if duplicates exist (e.g., "yacht-name-2")
        if (duplicates.totalDocs > 0) {
            payload.logger.info(
                `${LOG_PREFIX} Found ${duplicates.totalDocs} duplicate slug(s). Incrementing slug.`,
            );
            slug = `${slug}-${duplicates.totalDocs + 1}`;
            payload.logger.info(`${LOG_PREFIX} New slug: "${slug}"`);
        }

        // ─────────────────────────────────────────────────────────────────
        // Page Deduplication Check (by Hull ID)
        // ─────────────────────────────────────────────────────────────────
        // Check if a page already exists for this hull. We use hull ID
        // rather than vessel ID because the same physical yacht may have
        // different vessel IDs across brokers.
        payload.logger.info(
            `${LOG_PREFIX} Checking for existing page with hull ID: "${hullId}"`,
        );

        const existing = await payload
            .find({
                collection: 'pages',
                where: {
                    and: [
                        {
                            'taxonomyData.resale.hullId': {
                                equals: hullId,
                            },
                        },
                        {
                            'taxonomyData.resale.hullId': {
                                not_equals: 'UNKNOWN',
                            },
                        },
                    ],
                },
                limit: 1,
            })
            .then(({ docs }) => docs.at(0));

        // ─────────────────────────────────────────────────────────────────
        // Broker Priority Logic
        // ─────────────────────────────────────────────────────────────────
        // Feadship-brokered listings take priority over third-party listings.
        // This ensures that if Feadship is directly selling a yacht, their
        // listing is shown rather than a third-party broker's listing.

        // Check if the existing page's broker is Feadship
        const existingBrokerIsFeadship =
            (
                existing?.taxonomyData?.resale?.yatcoBroker as Record<
                    string,
                    unknown
                >
            )?.BrokerID === String(YATCO_FEADSHIP_BROKER_ID);

        // Check if this vessel's broker is Feadship
        const vesselBrokerIsFeadship = vessel.Brokers?.some(
            (broker) => broker.BrokerID === YATCO_FEADSHIP_BROKER_ID,
        );

        payload.logger.info(
            `${LOG_PREFIX} Existing page: ${existing ? `found (id: ${existing.id})` : 'not found'}`,
        );
        payload.logger.info(
            `${LOG_PREFIX} Existing broker is Feadship: ${existingBrokerIsFeadship}`,
        );
        payload.logger.info(
            `${LOG_PREFIX} New vessel broker is Feadship: ${vesselBrokerIsFeadship}`,
        );

        // Apply broker priority rules when a page already exists
        if (existing) {
            // Case 1: Existing is third-party, new is Feadship → Replace
            // Delete the third-party page so Feadship's version can be created
            if (!existingBrokerIsFeadship && vesselBrokerIsFeadship) {
                payload.logger.info(
                    `${LOG_PREFIX} Deleting existing third-party page (id: ${existing.id}) to replace with Feadship listing`,
                );

                await payload.delete({
                    collection: 'pages',
                    id: existing.id,
                });
            }

            // Case 2: Existing is Feadship, new is third-party → Keep existing
            // Don't replace Feadship's listing with a third-party listing
            if (existingBrokerIsFeadship && !vesselBrokerIsFeadship) {
                payload.logger.info(
                    `${LOG_PREFIX} Keeping existing Feadship page (id: ${existing.id}), skipping third-party listing`,
                );
                return {
                    output: {
                        success: true,
                        pageId: existing.id,
                    },
                };
            }

            // Case 3: Both same broker type → Keep existing
            payload.logger.info(
                `${LOG_PREFIX} Existing page with same broker type found (id: ${existing.id}), skipping creation`,
            );
            return {
                output: {
                    success: true,
                    pageId: existing.id,
                },
            };
        }

        payload.logger.info(
            `${LOG_PREFIX} Creating page for vessel with ID ${vesselId}, title: "${title}", slug: "${slug}", hull ID: "${hullId}"`,
        );

        // ─────────────────────────────────────────────────────────────────
        // CraftCMS Data Lookup for About Content
        // ─────────────────────────────────────────────────────────────────
        // Look up yacht data from CraftCMS export to get DVDB about content.
        // This data will also be reused later for gallery images.
        payload.logger.info(
            `${LOG_PREFIX} Looking up yacht in CraftCMS export data (YATCO vessel ID: ${vesselId}) for about content`,
        );

        const craftcmsYachtData = await findYachtByYatcoId(String(vesselId));

        // Extract and convert about content from DVDB data
        let aboutLexical:
            | Awaited<ReturnType<typeof convertHTMLToLexical>>
            | undefined;
        const aboutHtml = extractDvdbAboutContent(craftcmsYachtData);

        if (aboutHtml) {
            payload.logger.info(
                `${LOG_PREFIX} Found DVDB about content. Converting HTML to Lexical.`,
            );

            const JSDOM = await import('jsdom').then((mod) => mod.JSDOM);
            aboutLexical = convertHTMLToLexical({
                editorConfig: await editorConfigFactory.fromEditor({
                    config: payload.config,
                    editor: RESALE_ABOUT_EDITOR_CONFIG,
                }),
                html: aboutHtml,
                JSDOM,
            });
        } else {
            payload.logger.info(
                `${LOG_PREFIX} No DVDB about content found for vessel.`,
            );
        }

        // Broker - prefer Feadship, fall back to first broker
        // This determines the broker contact info shown on the page
        const yatcoBroker = await findBrokerByVesselId(
            vessel.Info?.VesselID,
            yatcoClient,
        );

        payload.logger.info(
            `${LOG_PREFIX} YATCO broker: ${yatcoBroker?.BrokerID}`,
        );
        payload.logger.info(yatcoBroker);

        // ─────────────────────────────────────────────────────────────────
        // Create Resale Page
        // ─────────────────────────────────────────────────────────────────
        // Create the new page with:
        // - taxonomyType: 'resale' to identify it as a resale listing
        // - taxonomyData.resale: stores hull ID (from CraftCMS if available), vessel ID, broker ID, and cached vessel data
        // - parent: the resale overview page for proper hierarchy
        // - template: the resale page template for consistent layout
        const created = await payload.create({
            collection: 'pages',
            context: { skipYatcoRefreshHook: true }, // Prevent refresh hook from firing on create
            data: {
                title,
                slug,
                parent: resalePage,
                taxonomyType: 'resale' as const,
                taxonomyData: {
                    resale: {
                        // Hull ID for deduplication (same yacht = same hull)
                        // Preferably from CraftCMS data, falls back to YATCO if not found
                        hullId,
                        // YATCO vessel ID for API reference
                        yatcoVesselId: String(vesselId),
                        yatcoBroker,
                        // Cache the full vessel data for SWR-style caching
                        yatcoData: Schema.encodeSync(Vessel)(vessel),
                        yatcoDataFetchedAt: new Date().toISOString(),
                        // About content from DVDB (converted to Lexical)
                        about: aboutLexical,
                    },
                },
                template: pageTemplate.id,
            },
        });

        payload.logger.info(
            `${LOG_PREFIX} Created page with ID ${created.id} for vessel with ID ${vesselId}`,
        );

        // ─────────────────────────────────────────────────────────────────
        // Redirect Setup
        // ─────────────────────────────────────────────────────────────────
        // Create a 308 (Permanent Redirect) from the old CraftCMS URI to the
        // new PayloadCMS page. This preserves SEO and ensures old links work.
        if (craftcmsYachtData?.uri) {
            const uri = craftcmsYachtData.uri;

            payload.logger.info(
                `${LOG_PREFIX} Creating redirect from old CraftCMS URI: ${uri}`,
            );

            // First, remove any existing redirect for this URI to avoid conflicts
            await payload.delete({
                collection: 'redirects',
                where: {
                    from: { equals: uri },
                },
            });

            // Create the redirect from old CraftCMS URI to the new page
            await payload.create({
                collection: 'redirects',
                data: {
                    from: uri,
                    to: {
                        type: 'reference',
                        reference: {
                            relationTo: 'pages',
                            value: created.id,
                        },
                    },
                    type: '308',
                },
            });

            payload.logger.info(
                `${LOG_PREFIX} Redirect created from: ${uri} to page id: ${created.id}`,
            );
        } else {
            payload.logger.info(
                `${LOG_PREFIX} No CraftCMS URI found for yacht. Skipping redirect creation.`,
            );
        }

        // ─────────────────────────────────────────────────────────────────
        // Image Marquee Block Creation from CraftCMS Gallery Data
        // ─────────────────────────────────────────────────────────────────
        // Create an image-marquee block with gallery images from the CraftCMS data.
        // Note: craftcmsYachtData was already looked up earlier for about content.

        if (craftcmsYachtData || vesselGallery?.length) {
            const galleryImages = [
                ...(craftcmsYachtData?.gallery?.imagesExterior ?? []),
                ...(craftcmsYachtData?.gallery?.imagesInterior ?? []),
                ...(vesselGallery ?? []),
            ];

            if (!galleryImages.length) {
                payload.logger.info(
                    `${LOG_PREFIX} Yacht found in CraftCMS but has no gallery images. Skipping gallery block.`,
                );
            } else {
                payload.logger.info(
                    `${LOG_PREFIX} Found yacht with ${galleryImages.length} gallery image(s). Creating image-marquee block.`,
                );

                const allGalleryImages = galleryImages.filter((asset) =>
                    'kind' in asset ? asset.kind === 'image' : true,
                );

                if (allGalleryImages.length > 0) {
                    payload.logger.info(
                        `${LOG_PREFIX} Found ${allGalleryImages.length} valid image assets.`,
                    );

                    // ───────────────────────────────────────────────────────
                    // Gallery Image Upload Strategy
                    // ───────────────────────────────────────────────────────
                    // IMPORTANT: Order of operations is critical to avoid
                    // race conditions.
                    //
                    // 1. Create placeholder block items with unique IDs
                    // 2. Collect upload job configs (but don't queue yet)
                    // 3. Save the block structure to the page FIRST
                    // 4. THEN queue the async upload jobs
                    //
                    // This ensures each upload job can find and update its
                    // target because the block structure already exists.
                    // ───────────────────────────────────────────────────────

                    // Step 1: Pre-allocate block items with unique IDs
                    const blockItems: NonNullable<
                        NonNullable<
                            Extract<
                                NonNullable<Page['blocks']>[number],
                                { blockType: 'image-marquee' }
                            >['items']
                        >
                    > = allGalleryImages.map(() => ({
                        id: crypto.randomUUID(),
                        media: {
                            type: 'image' as const,
                        },
                    }));

                    const imageMarqueeBlockId = crypto.randomUUID();

                    // Step 2: Collect upload jobs (don't queue yet)
                    const galleryUploadsQueue: Parameters<
                        typeof payload.jobs.queue<'createUploadFromUrl'>
                    >[] = [];

                    for (const [
                        index,
                        imageAsset,
                    ] of allGalleryImages.entries()) {
                        const filename =
                            'filename' in imageAsset
                                ? imageAsset.filename
                                : crypto.randomUUID();

                        const imageUrl =
                            'filename' in imageAsset
                                ? await resolveYachtImageUrl(filename)
                                : 'largeImageURL' in imageAsset
                                  ? imageAsset.largeImageURL
                                  : null;

                        if (!imageUrl) {
                            payload.logger.warn(
                                `${LOG_PREFIX} No accessible URL found for gallery image "${filename}". Tried multiple paths.`,
                            );
                            continue;
                        }

                        payload.logger.info(
                            `${LOG_PREFIX} Processing gallery image "${filename}" (resolved URL: ${imageUrl})`,
                        );

                        // Check if media already exists (deduplication)
                        const existingGalleryMedia = await payload
                            .find({
                                collection: 'media',
                                where: {
                                    source: { equals: imageUrl },
                                },
                                limit: 1,
                            })
                            .then((x) => x.docs.at(0));

                        if (existingGalleryMedia) {
                            // Media exists - attach directly to block item
                            payload.logger.info(
                                `${LOG_PREFIX} Media already exists for URL: ${imageUrl}. Attaching existing media (ID: ${existingGalleryMedia.id}) to block.`,
                            );

                            const currentBlockItem = blockItems[index];
                            if (currentBlockItem) {
                                currentBlockItem.media = {
                                    type: 'image' as const,
                                    image: { media: existingGalleryMedia.id },
                                };
                            }
                        } else {
                            // Media doesn't exist - add to upload queue
                            const path = `blocks.0.items.${index}.media.image.media`;
                            payload.logger.info(
                                `${LOG_PREFIX} Adding upload job for "${filename}" to queue (path: ${path})`,
                            );

                            galleryUploadsQueue.push([
                                {
                                    task: 'createUploadFromUrl',
                                    queue: 'media-sync',
                                    input: {
                                        url: imageUrl,
                                        target: {
                                            collection: 'pages',
                                            doc: created.id,
                                            path,
                                        },
                                    },
                                },
                            ]);
                        }
                    }

                    // Step 3: Save block structure to page BEFORE queueing
                    await payload.update({
                        collection: 'pages',
                        id: created.id,
                        data: {
                            blocks: [
                                {
                                    id: imageMarqueeBlockId,
                                    blockType: 'image-marquee',
                                    contextual: false,
                                    items: blockItems,
                                    layout: {
                                        width: 'fluid',
                                    },
                                },
                            ],
                        },
                    });

                    payload.logger.info(
                        `${LOG_PREFIX} Image-marquee block saved with ${blockItems.length} item(s). Now queueing ${galleryUploadsQueue.length} upload job(s).`,
                    );

                    // Step 4: NOW queue the upload jobs
                    for (const args of galleryUploadsQueue) {
                        await payload.jobs.queue(...args);
                        payload.logger.info(
                            `${LOG_PREFIX} Upload job queued for path: ${args.at(0)?.input?.target?.path}`,
                        );
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // Queue Cover Image Upload
        // ─────────────────────────────────────────────────────────────────
        // Fetch the main photo from YATCO and queue an upload job.
        // This separates media handling from page creation, allowing
        // the page to be created immediately while images are processed
        // asynchronously.
        const mainPhoto = await yatcoClient.ForSale.Vessel.Photo.Main({
            vesselId,
        });

        if (mainPhoto?.largeImageURL) {
            payload.logger.info(
                `${LOG_PREFIX} Processing cover image for page ${created.id}`,
            );

            const existingMedia = await payload
                .find({
                    collection: 'media',
                    where: {
                        source: { equals: mainPhoto.largeImageURL },
                    },
                })
                .then((x) => x.docs.at(0));

            if (existingMedia) {
                payload.logger.info(
                    `${LOG_PREFIX} Cover image already exists in media library (id: ${existingMedia.id}). Linking existing media.`,
                );

                // Update the created page to link the existing media
                await payload.update({
                    collection: 'pages',
                    id: created.id,
                    data: {
                        taxonomyData: {
                            resale: {
                                cover: {
                                    media: existingMedia.id,
                                },
                            },
                        },
                    },
                });
            } else {
                payload.logger.info(
                    `${LOG_PREFIX} Queueing cover image upload job for url: ${mainPhoto.largeImageURL}`,
                );

                // Queue the media upload job on the media-sync queue
                // This will download the image and update the page's cover field
                await payload.jobs.queue({
                    task: 'createUploadFromUrl',
                    queue: 'media-sync',
                    input: {
                        url: mainPhoto.largeImageURL,
                        target: {
                            collection: 'pages',
                            doc: created.id,
                            path: 'taxonomyData.resale.cover.media',
                        },
                    },
                });
            }

            payload.logger.info(
                `${LOG_PREFIX} Cover image processing completed for page ${created.id}`,
            );
        } else {
            payload.logger.warn(
                `${LOG_PREFIX} No main photo found for vessel with ID ${vesselId}`,
            );
        }

        return {
            output: {
                success: true,
                pageId: created.id,
            },
        };
    },
};
