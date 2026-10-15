import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'unique-articles.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'unique-assets.jsonl');

async function extractUniqueAssets() {
  console.log('🔄 Extracting unique assets from articles...\n');

  const uniqueAssets = new Map();
  const assetUsageCount = new Map();
  let totalArticles = 0;
  let totalAssetReferences = 0;

  // Read all articles and extract assets
  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('📖 Reading articles and extracting assets...');

  for await (const line of rl) {
    totalArticles++;

    try {
      const article = JSON.parse(line);

      // Extract assets from relatedAssets array
      if (article.relatedAssets && Array.isArray(article.relatedAssets)) {
        for (const asset of article.relatedAssets) {
          totalAssetReferences++;

          const assetId = asset.targetId;

          if (!assetId) {
            console.warn(`⚠️  Asset in article ${article.id} has no targetId, skipping`);
            continue;
          }

          // Track usage count
          assetUsageCount.set(assetId, (assetUsageCount.get(assetId) || 0) + 1);

          // Store unique asset
          if (!uniqueAssets.has(assetId)) {
            uniqueAssets.set(assetId, asset);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error parsing article ${totalArticles}:`, error.message);
    }

    if (totalArticles % 50 === 0) {
      console.log(`  Processed ${totalArticles} articles...`);
    }
  }

  console.log(`✓ Processed ${totalArticles} articles\n`);

  // Convert to array and sort by targetId
  const assetsArray = Array.from(uniqueAssets.values()).sort((a, b) => {
    return a.targetId - b.targetId;
  });

  // Write to output file
  console.log(`💾 Writing unique assets to ${OUTPUT_FILE}...`);

  const outputLines = assetsArray.map(asset => JSON.stringify(asset)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, outputLines, 'utf8');

  console.log(`✅ Successfully created ${OUTPUT_FILE}\n`);

  // Statistics
  console.log('📊 Asset Extraction Statistics:');
  console.log('─'.repeat(60));
  console.log(`Total articles processed:        ${totalArticles}`);
  console.log(`Total asset references:          ${totalAssetReferences}`);
  console.log(`Unique assets extracted:         ${assetsArray.length}`);
  console.log(`Duplicate references removed:    ${totalAssetReferences - assetsArray.length}`);
  console.log(`Average assets per article:      ${(totalAssetReferences / totalArticles).toFixed(1)}`);
  console.log('');

  // Asset types breakdown
  const byKind = {};
  assetsArray.forEach(asset => {
    const kind = asset.kind || 'unknown';
    byKind[kind] = (byKind[kind] || 0) + 1;
  });

  console.log('📁 Assets by Type:');
  console.log('─'.repeat(60));
  Object.keys(byKind).sort().forEach(kind => {
    console.log(`${kind}: ${byKind[kind]} assets`);
  });
  console.log('');

  // Most used assets
  const sortedByUsage = Array.from(assetUsageCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('🔥 Most Referenced Assets (Top 10):');
  console.log('─'.repeat(60));
  sortedByUsage.forEach(([assetId, count], index) => {
    const asset = uniqueAssets.get(assetId);
    const filename = asset?.filename || 'Unknown';
    const kind = asset?.kind || 'unknown';
    console.log(`${index + 1}. ${count}x - [${kind}] ${filename.substring(0, 45)}${filename.length > 45 ? '...' : ''}`);
  });
  console.log('');

  // File size statistics
  const sizes = assetsArray
    .filter(a => a.size && typeof a.size === 'number')
    .map(a => a.size);

  if (sizes.length > 0) {
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const avgSize = totalSize / sizes.length;
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);

    console.log('💾 File Size Statistics:');
    console.log('─'.repeat(60));
    console.log(`Total size:       ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Average size:     ${(avgSize / 1024).toFixed(2)} KB`);
    console.log(`Largest file:     ${(maxSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Smallest file:    ${(minSize / 1024).toFixed(2)} KB`);
    console.log('');
  }

  // Date range
  const dates = assetsArray
    .filter(a => a.dateCreated)
    .map(a => new Date(a.dateCreated));

  if (dates.length > 0) {
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));

    console.log('📅 Date Range:');
    console.log('─'.repeat(60));
    console.log(`Oldest asset:  ${oldestDate.toISOString().split('T')[0]}`);
    console.log(`Newest asset:  ${newestDate.toISOString().split('T')[0]}`);
    console.log('');
  }

  console.log('✨ Asset extraction complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

// Run
extractUniqueAssets().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
