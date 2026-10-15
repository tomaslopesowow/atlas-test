/**
 * @module yacht-data-loader
 *
 * Shared utility for loading yacht data from the CraftCMS JSONL export file.
 * Used by both sync-fleet.ts (to get the list of yachts) and create-fleet-page.ts
 * (to look up cover images and related assets).
 */

import { Schema } from 'effect';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base URL for CraftCMS media files stored in S3.
 * Yacht images are publicly accessible via direct S3 URLs.
 */
export const S3_BASE_URL = 'https://stomp-feadship-prod.s3.amazonaws.com';

/**
 * Known S3 paths where yacht images may be stored.
 * Order matters - most likely paths first.
 */
const IMAGE_PATH_CANDIDATES = [
    'craft/media/images', // Documented path in ASSET_URL_STRUCTURE.md
    'craft/yachtImages', // Yacht-specific volume from VOLUME_PATH_MAP
    'craft/yachts/images', // Legacy path (may work for some)
];

/**
 * Path to the yacht data JSONL file extracted from CraftCMS.
 * This file contains yacht records with cover image references.
 */
export const YACHTS_FILE = path.join(
    process.cwd(),
    'seed/craftcms/unique-yachts.jsonl',
);

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for third party data content (parsed from JSON string).
 * Made permissive to handle different source types (DVDB, 7SEAS, yatco).
 */
const ThirdPartyContent = Schema.Struct({
    devoogt_id: Schema.optional(Schema.NullishOr(Schema.Number)),
}).annotations({ identifier: 'ThirdPartyContent' });

/**
 * Schema for third party data entry.
 * The content field is a JSON string that may contain different structures
 * depending on the sourceType. We use a union to handle both object and array formats.
 */
const ThirdPartyDataEntry = Schema.Struct({
    sourceId: Schema.optional(Schema.NullishOr(Schema.String)),
    sourceType: Schema.String,
    content: Schema.Union(
        Schema.parseJson(ThirdPartyContent),
        Schema.parseJson(Schema.Array(Schema.Unknown)), // Handle "[]" content from 7SEAS/yatco
    ),
}).annotations({ identifier: 'ThirdPartyDataEntry' });

/**
 * Schema for related asset data.
 * Uses Record to be permissive about additional fields like focalPoint.
 */
const RelatedAsset = Schema.Struct({
    fieldId: Schema.optional(Schema.NullishOr(Schema.Number)),
    targetId: Schema.optional(Schema.NullishOr(Schema.Number)),
    sortOrder: Schema.optional(Schema.NullishOr(Schema.Number)),
    filename: Schema.optional(Schema.NullishOr(Schema.String)),
    kind: Schema.optional(Schema.NullishOr(Schema.String)),
    alt: Schema.optional(Schema.NullishOr(Schema.String)),
    width: Schema.optional(Schema.NullishOr(Schema.String)),
    height: Schema.optional(Schema.NullishOr(Schema.String)),
    size: Schema.optional(Schema.NullishOr(Schema.Unknown)),
}).annotations({ identifier: 'RelatedAsset' });

/**
 * Schema for gallery image data.
 * Similar to RelatedAsset but with additional specificationType field.
 */
const GalleryImage = Schema.Struct({
    targetId: Schema.optional(Schema.NullishOr(Schema.Number)),
    sortOrder: Schema.optional(Schema.NullishOr(Schema.Number)),
    filename: Schema.optional(Schema.NullishOr(Schema.String)),
    kind: Schema.optional(Schema.NullishOr(Schema.String)),
    alt: Schema.optional(Schema.NullishOr(Schema.String)),
    width: Schema.optional(Schema.NullishOr(Schema.String)),
    height: Schema.optional(Schema.NullishOr(Schema.String)),
    size: Schema.optional(Schema.NullishOr(Schema.Unknown)),
    focalPoint: Schema.optional(Schema.NullishOr(Schema.Unknown)),
    specificationType: Schema.optional(Schema.NullishOr(Schema.String)),
}).annotations({ identifier: 'GalleryImage' });

/**
 * Schema for gallery data containing exterior and interior images.
 */
const Gallery = Schema.Struct({
    imagesExterior: Schema.optional(
        Schema.NullishOr(Schema.Array(GalleryImage)),
    ),
    imagesInterior: Schema.optional(
        Schema.NullishOr(Schema.Array(GalleryImage)),
    ),
    videos: Schema.optional(Schema.NullishOr(Schema.Array(Schema.Unknown))),
}).annotations({ identifier: 'Gallery' });

/**
 * Schema for yacht data extracted from CraftCMS.
 * Represents the structure of yacht records in the unique-yachts.jsonl file.
 *
 * @property id - CraftCMS yacht entry ID
 * @property slug - URL-safe yacht identifier
 * @property thirdPartyData - Array containing De Voogt DB data (includes devoogt_id)
 * @property relatedAssets - Array of media assets (images) associated with the yacht
 */
export type YachtData = Schema.Schema.Type<typeof YachtData>;
export const YachtData = Schema.Struct({
    id: Schema.Number,
    slug: Schema.String,
    uri: Schema.optional(Schema.NullishOr(Schema.String)),
    thirdPartyData: Schema.NullishOr(Schema.Array(ThirdPartyDataEntry)),
    relatedAssets: Schema.NullishOr(Schema.Array(RelatedAsset)),
    gallery: Schema.optional(Schema.NullishOr(Gallery)),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the DVDB entry from a yacht's thirdPartyData array.
 * The DVDB entry may not be at index 0 if the yacht has multiple data sources.
 */
function getDvdbEntry(yacht: YachtData) {
    return yacht.thirdPartyData?.find((entry) => entry.sourceType === 'DVDB');
}

/**
 * Extracts the devoogt_id from a third party data entry's content.
 * Content can be either an object with devoogt_id or an array (from 7SEAS/yatco).
 */
function getDevoogtId(
    content: Schema.Schema.Type<typeof ThirdPartyDataEntry>['content'],
): number | null {
    // Content is either an array (7SEAS/yatco) or an object with devoogt_id (DVDB)
    if (Array.isArray(content)) {
        return null;
    }
    // TypeScript needs explicit cast since union narrowing doesn't work with readonly arrays
    const dvdbContent = content as { readonly devoogt_id?: number | null };
    return dvdbContent?.devoogt_id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a working URL for a yacht image by testing candidate paths.
 * Uses HEAD requests to avoid downloading the full image.
 *
 * @param filename - The image filename to resolve
 * @returns The first working URL, or null if no path works
 */
export async function resolveYachtImageUrl(
    filename?: string | null,
): Promise<string | null> {
    if (!filename) return null;

    const candidates = IMAGE_PATH_CANDIDATES.map(
        (path) => new URL(`/${path}/${filename}`, S3_BASE_URL).href,
    );

    for (const candidateUrl of candidates) {
        try {
            const response = await fetch(candidateUrl, { method: 'HEAD' });
            if (response.ok) {
                return candidateUrl;
            }
        } catch {
            // Continue to next candidate
        }
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache & Loading Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Module-level cache for yacht data loaded from JSONL.
 * Prevents redundant file reads when processing multiple yachts.
 */
let yachtsCache: Map<number, YachtData> | null = null;

/**
 * Clears the yacht cache. Useful for testing or when the JSONL file changes.
 */
export function clearYachtsCache(): void {
    yachtsCache = null;
}

/**
 * Loads yacht data from the JSONL file and caches it in memory.
 * The data is indexed by De Voogt DB ID for fast lookups.
 *
 * @returns Map of De Voogt DB IDs to yacht data records
 */
export async function loadYachts(): Promise<Map<number, YachtData>> {
    // Return cached data if already loaded
    if (yachtsCache) return yachtsCache;

    const yachtMap = new Map<number, YachtData>();
    let fileStream: fs.ReadStream | null = null;
    let rl: readline.Interface | null = null;

    try {
        fileStream = fs.createReadStream(YACHTS_FILE);
        rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            try {
                const parsed = JSON.parse(line);
                const yacht = Schema.decodeUnknownSync(YachtData, {
                    onExcessProperty: 'preserve',
                })(parsed);

                // Find the DVDB entry and extract devoogt_id
                const dvdbEntry = getDvdbEntry(yacht);
                const dvdbId = dvdbEntry
                    ? getDevoogtId(dvdbEntry.content)
                    : null;

                if (dvdbId) {
                    yachtMap.set(dvdbId, yacht);
                }
            } catch {
                // Skip invalid lines (malformed JSON or schema validation failures)
            }
        }

        yachtsCache = yachtMap;
    } catch (error) {
        // If file doesn't exist or can't be read, return empty map
        console.warn(`Could not load yachts file at ${YACHTS_FILE}:`, error);
        yachtsCache = new Map();
    } finally {
        // Ensure readline interface is closed
        rl?.close();
        // Destroy the file stream to release file handle
        fileStream?.destroy();
        // Clear the cache
        clearYachtsCache();
    }

    return yachtMap;
}

/**
 * Finds yacht data by De Voogt DB ID from the cached JSONL data.
 *
 * @param dvdbId - The De Voogt DB reference ID to look up
 * @returns The yacht data record, or null if not found
 */
export async function findYachtByDvdbId(
    dvdbId: number | null | undefined,
): Promise<YachtData | null> {
    if (dvdbId == null) return null;

    const yachtMap = await loadYachts();
    return yachtMap.get(dvdbId) ?? null;
}

/**
 * Finds yacht data by YATCO vessel ID from the JSONL data.
 * Searches through thirdPartyData entries for a matching sourceType='yatco' and sourceId.
 *
 * @param yatcoVesselId - The YATCO vessel ID to look up
 * @returns The yacht data record, or null if not found
 */
export async function findYachtByYatcoId(
    yatcoVesselId: string | null | undefined,
): Promise<YachtData | null> {
    if (yatcoVesselId == null) return null;

    const yachtMap = await loadYachts();

    // Search through all yachts for matching YATCO vessel ID
    for (const yacht of yachtMap.values()) {
        const yatcoEntry = yacht.thirdPartyData?.find(
            (entry) =>
                entry.sourceType === 'yatco' &&
                entry.sourceId === yatcoVesselId,
        );
        if (yatcoEntry) {
            return yacht;
        }
    }

    return null;
}

/**
 * Gets all yachts that have De Voogt DB as their data source.
 *
 * @returns Array of yacht data records with DVDB source
 */
export async function getDvdbSourcedYachts(): Promise<YachtData[]> {
    const yachtMap = await loadYachts();
    return Array.from(yachtMap.values()).filter(
        (yacht) => getDvdbEntry(yacht) != null,
    );
}

/**
 * Extracts the devoogt_id from a yacht's DVDB data.
 * Exported for use by sync tasks.
 */
export function getYachtDevoogtId(yacht: YachtData): number | null {
    const dvdbEntry = getDvdbEntry(yacht);
    return dvdbEntry ? getDevoogtId(dvdbEntry.content) : null;
}
