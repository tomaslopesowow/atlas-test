import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'unique-assets.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'unique-assets-with-urls.jsonl');

// S3 Configuration
const S3_BUCKET = 'stomp-feadship-prod';
const CLOUDFRONT_URL = 'https://dbj7896sklvdk.cloudfront.net';
const S3_BASE_PATH = 'craft/media';

/**
 * Get the S3 path for an asset based on its kind
 */
function getS3Path(asset) {
  const { kind, filename } = asset;

  // Images go in /images/, everything else (PDFs, etc.) goes in /files/
  const subPath = kind === 'image' ? 'images' : 'files';

  return `${S3_BASE_PATH}/${subPath}/${filename}`;
}

/**
 * Get the S3 URL for an asset
 */
function getS3Url(s3Key) {
  return `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
}

/**
 * Get the CloudFront URL for an asset
 */
function getCloudFrontUrl(s3Key) {
  return `${CLOUDFRONT_URL}/${s3Key}`;
}

async function addAssetUrls() {
  console.log('🔄 Adding S3 and CloudFront URLs to assets...\n');

  const enhancedAssets = [];
  let totalAssets = 0;

  // Read all assets
  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('📖 Reading assets and generating URLs...');

  for await (const line of rl) {
    totalAssets++;

    try {
      const asset = JSON.parse(line);

      // Generate S3 key and URLs
      const s3Key = getS3Path(asset);
      const s3Url = getS3Url(s3Key);
      const cloudFrontUrl = getCloudFrontUrl(s3Key);

      // Create enhanced asset with URL information
      const enhancedAsset = {
        ...asset,
        s3: {
          bucket: S3_BUCKET,
          key: s3Key,
          url: s3Url
        },
        cloudfront: {
          url: cloudFrontUrl
        },
        // Convenience field - the primary URL to use
        url: cloudFrontUrl
      };

      enhancedAssets.push(enhancedAsset);
    } catch (error) {
      console.error(`❌ Error parsing asset ${totalAssets}:`, error.message);
    }

    if (totalAssets % 50 === 0) {
      console.log(`  Processed ${totalAssets} assets...`);
    }
  }

  console.log(`✓ Processed ${totalAssets} assets\n`);

  // Write to output file
  console.log(`💾 Writing enhanced assets to ${OUTPUT_FILE}...`);

  const outputLines = enhancedAssets.map(asset => JSON.stringify(asset)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, outputLines, 'utf8');

  console.log(`✅ Successfully created ${OUTPUT_FILE}\n`);

  // Statistics
  console.log('📊 URL Generation Statistics:');
  console.log('─'.repeat(60));
  console.log(`Total assets processed:      ${totalAssets}`);
  console.log(`Assets with URLs added:      ${enhancedAssets.length}`);
  console.log('');

  // Breakdown by asset kind and path
  const byPath = {};
  enhancedAssets.forEach(asset => {
    const subPath = asset.kind === 'image' ? 'images' : 'files';
    byPath[subPath] = (byPath[subPath] || 0) + 1;
  });

  console.log('📁 Assets by S3 Path:');
  console.log('─'.repeat(60));
  console.log(`craft/media/images/: ${byPath.images || 0} assets (images)`);
  console.log(`craft/media/files/:  ${byPath.files || 0} assets (PDFs and other files)`);
  console.log('');

  // Sample URLs
  console.log('🔗 Sample Asset URLs (first 5):');
  console.log('─'.repeat(60));
  enhancedAssets.slice(0, 5).forEach((asset, index) => {
    console.log(`${index + 1}. [${asset.kind}] ${asset.filename}`);
    console.log(`   S3 Key:      ${asset.s3.key}`);
    console.log(`   CloudFront:  ${asset.url}`);
    console.log('');
  });

  console.log('✨ URL generation complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

// Run
addAssetUrls().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
