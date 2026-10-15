import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTICLES_INPUT_FILE = path.join(__dirname, 'unique-articles.jsonl');
const PRESS_INPUT_FILE = path.join(__dirname, 'press-entries.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'unique-contentblock-media.jsonl');

// S3 Configuration
const S3_BUCKET = 'stomp-feadship-prod';
const S3_BASE_URL = `https://${S3_BUCKET}.s3.amazonaws.com`;

// Volume handle to S3 path mapping
// Based on investigation of CraftCMS volume configuration
const VOLUME_PATH_MAP = {
  // Media volumes (public)
  mediaImages: 'craft/media/images',
  mediaFiles: 'craft/media/files',
  yachtImages: 'craft/yachtImages',

  // Video embed volumes (public)
  youtube: 'craft/youtube',
  vimeo: 'craft/vimeo',

  // Other volumes (may be protected)
  avatars: 'craft/avatars',
  buildAssetsKaag: 'craft/buildAssetsKaag',
  buildAssetsMakkum: 'craft/buildAssetsMakkum',
  buildAssetsAalsmeer: 'craft/buildAssetsAalsmeer',
  presentationFiles: 'craft/presentationFiles',
  svgAnimation: 'craft/svgAnimation',
  appAssets: 'craft/appAssets',
  compressedAssets: 'craft/compressedAssets',
  ugc: 'craft/ugc',
};

// Field ID to volume handle mapping (approximate based on common patterns)
// fieldId 11 = mediaImages, fieldId 12 = various (vimeo, youtube, etc.)
const FIELD_VOLUME_HINTS = {
  11: 'mediaImages',   // Image fields
  12: null,            // Could be vimeo, youtube, or other - need filename pattern
};

/**
 * Get volume handle from media data or infer from filename patterns as fallback
 */
function getVolumeHandle(media) {
  const { filename, kind, fieldId, volumeHandle } = media;

  // If volumeHandle is already present in the data (from database), use it directly
  if (volumeHandle) {
    return volumeHandle;
  }

  // Fallback: infer from patterns (for older data or edge cases)
  // Images typically come from mediaImages
  if (kind === 'image') {
    return 'mediaImages';
  }

  // JSON files need pattern matching
  if (kind === 'json' && filename) {
    // These patterns indicate video embeds
    if (filename.includes('Feadship') || filename.includes('feadship')) {
      // Could be youtube or vimeo - check for common patterns
      // Vimeo files often have specific naming patterns
      if (filename.match(/^\d+-.*\.json$/) || filename.includes('vimeo')) {
        return 'vimeo';
      }
      return 'youtube'; // Default to youtube for Feadship video embeds
    }
    if (filename.startsWith('embed_')) {
      return 'youtube'; // embed_ prefix often used for youtube
    }
  }

  // PDFs go to mediaFiles
  if (kind === 'pdf') {
    return 'mediaFiles';
  }

  // Default fallback based on kind
  return kind === 'image' ? 'mediaImages' : 'mediaFiles';
}

/**
 * Get the S3 URL for an asset
 */
function getS3Url(media, volumeHandle) {
  const basePath = VOLUME_PATH_MAP[volumeHandle] || 'craft/media/files';
  return `${S3_BASE_URL}/${basePath}/${media.filename}`;
}

/**
 * Extract media from contentBlocks in a JSONL file
 * @param {string} filePath - Path to the JSONL file
 * @param {string} sourceType - Type of source ('articles' or 'press entries')
 * @returns {Object} Stats about the extraction
 */
async function extractMediaFromFile(filePath, sourceType) {
  const stats = {
    entries: 0,
    contentBlocks: 0,
    mediaReferences: 0,
    uniqueMedia: new Map(),
    mediaUsageCount: new Map(),
  };

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return stats;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log(`📖 Reading ${sourceType} from ${path.basename(filePath)}...`);

  for await (const line of rl) {
    stats.entries++;

    try {
      const entry = JSON.parse(line);

      // Extract media from contentBlocks array
      if (entry.contentBlocks && Array.isArray(entry.contentBlocks)) {
        for (const block of entry.contentBlocks) {
          stats.contentBlocks++;

          if (block.media && Array.isArray(block.media)) {
            for (const media of block.media) {
              stats.mediaReferences++;

              const mediaId = media.targetId;

              if (!mediaId) {
                console.warn(`⚠️  Media in ${sourceType} ${entry.id} has no targetId, skipping`);
                continue;
              }

              // Track usage count
              stats.mediaUsageCount.set(mediaId, (stats.mediaUsageCount.get(mediaId) || 0) + 1);

              // Store unique media with URL info
              if (!stats.uniqueMedia.has(mediaId)) {
                const volumeHandle = getVolumeHandle(media);
                const s3Url = getS3Url(media, volumeHandle);

                stats.uniqueMedia.set(mediaId, {
                  targetId: media.targetId,
                  fieldId: media.fieldId,
                  filename: media.filename,
                  kind: media.kind,
                  alt: media.alt,
                  width: media.width,
                  height: media.height,
                  size: media.size,
                  focalPoint: media.focalPoint,
                  dateCreated: media.dateCreated,
                  volumeHandle,
                  s3: {
                    bucket: S3_BUCKET,
                    key: `${VOLUME_PATH_MAP[volumeHandle] || 'craft/media/files'}/${media.filename}`,
                  },
                  url: s3Url
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error parsing ${sourceType} ${stats.entries}:`, error.message);
    }

    if (stats.entries % 50 === 0) {
      console.log(`  Processed ${stats.entries} ${sourceType}...`);
    }
  }

  console.log(`✓ Processed ${stats.entries} ${sourceType}\n`);
  return stats;
}

async function extractContentBlockMedia() {
  console.log('🔄 Extracting media from contentBlocks...\n');

  // Extract from articles
  const articleStats = await extractMediaFromFile(ARTICLES_INPUT_FILE, 'articles');

  // Extract from press entries
  const pressStats = await extractMediaFromFile(PRESS_INPUT_FILE, 'press entries');

  // Merge unique media from both sources (deduplicate by targetId)
  const uniqueMedia = new Map();
  const mediaUsageCount = new Map();

  // First add all article media
  for (const [targetId, media] of articleStats.uniqueMedia) {
    uniqueMedia.set(targetId, media);
    mediaUsageCount.set(targetId, articleStats.mediaUsageCount.get(targetId) || 0);
  }

  // Then add press media (won't duplicate existing)
  let sharedMediaCount = 0;
  for (const [targetId, media] of pressStats.uniqueMedia) {
    if (!uniqueMedia.has(targetId)) {
      uniqueMedia.set(targetId, media);
    } else {
      sharedMediaCount++;
    }
    // Add to usage count (media might be used in both articles and press)
    mediaUsageCount.set(targetId, (mediaUsageCount.get(targetId) || 0) + (pressStats.mediaUsageCount.get(targetId) || 0));
  }

  // Calculate totals
  const totalEntries = articleStats.entries + pressStats.entries;
  const totalContentBlocks = articleStats.contentBlocks + pressStats.contentBlocks;
  const totalMediaReferences = articleStats.mediaReferences + pressStats.mediaReferences;

  // Convert to array and sort by targetId
  const mediaArray = Array.from(uniqueMedia.values()).sort((a, b) => {
    return a.targetId - b.targetId;
  });

  // Write to output file
  console.log(`💾 Writing unique media to ${OUTPUT_FILE}...`);

  const outputLines = mediaArray.map(media => JSON.stringify(media)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, outputLines, 'utf8');

  console.log(`✅ Successfully created ${OUTPUT_FILE}\n`);

  // Statistics
  console.log('📊 ContentBlock Media Extraction Statistics:');
  console.log('─'.repeat(60));
  console.log(`Total entries processed:         ${totalEntries}`);
  console.log(`  - Articles:                    ${articleStats.entries}`);
  console.log(`  - Press entries:               ${pressStats.entries}`);
  console.log(`Total contentBlocks scanned:     ${totalContentBlocks}`);
  console.log(`Total media references:          ${totalMediaReferences}`);
  console.log(`  - From articles:               ${articleStats.mediaReferences}`);
  console.log(`  - From press entries:          ${pressStats.mediaReferences}`);
  console.log(`Unique media extracted:          ${mediaArray.length}`);
  console.log(`  - Unique to articles:          ${articleStats.uniqueMedia.size - sharedMediaCount}`);
  console.log(`  - Unique to press entries:     ${pressStats.uniqueMedia.size - sharedMediaCount}`);
  console.log(`  - Shared between both:         ${sharedMediaCount}`);
  console.log(`Duplicate references removed:    ${totalMediaReferences - mediaArray.length}`);
  console.log('');

  // Media types breakdown
  const byKind = {};
  mediaArray.forEach(media => {
    const kind = media.kind || 'unknown';
    byKind[kind] = (byKind[kind] || 0) + 1;
  });

  console.log('📁 Media by Type:');
  console.log('─'.repeat(60));
  Object.keys(byKind).sort().forEach(kind => {
    console.log(`${kind}: ${byKind[kind]} assets`);
  });
  console.log('');

  // By volume
  const byVolume = {};
  mediaArray.forEach(media => {
    const vol = media.volumeHandle || 'unknown';
    byVolume[vol] = (byVolume[vol] || 0) + 1;
  });

  console.log('📂 Media by Volume:');
  console.log('─'.repeat(60));
  Object.keys(byVolume).sort().forEach(vol => {
    console.log(`${vol}: ${byVolume[vol]} assets`);
  });
  console.log('');

  // Sample URLs
  console.log('🔗 Sample Media URLs (S3):');
  console.log('─'.repeat(60));

  // Show some JSON files specifically
  const jsonMedia = mediaArray.filter(m => m.kind === 'json').slice(0, 3);
  if (jsonMedia.length > 0) {
    console.log('\nJSON files (videos):');
    jsonMedia.forEach((media, index) => {
      console.log(`${index + 1}. ${media.filename}`);
      console.log(`   Volume: ${media.volumeHandle}`);
      console.log(`   S3: ${media.url}`);
    });
  }

  // Show some image files
  const imageMedia = mediaArray.filter(m => m.kind === 'image').slice(0, 3);
  if (imageMedia.length > 0) {
    console.log('\nImages:');
    imageMedia.forEach((media, index) => {
      console.log(`${index + 1}. ${media.filename}`);
      console.log(`   Volume: ${media.volumeHandle}`);
      console.log(`   S3: ${media.url}`);
    });
  }

  console.log('');
  console.log('✨ ContentBlock media extraction complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

// Run
extractContentBlockMedia().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
