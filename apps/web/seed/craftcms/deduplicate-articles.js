import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'news-articles.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'unique-articles.jsonl');

async function deduplicateArticles() {
  console.log('🔄 Deduplicating news articles...\n');

  const latestArticles = new Map();
  const revisionCounts = new Map();
  let totalRecords = 0;

  // Read all articles and keep only latest version per slug
  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('📖 Reading articles...');

  for await (const line of rl) {
    totalRecords++;

    try {
      const article = JSON.parse(line);
      const slug = article.slug;

      if (!slug) {
        console.warn(`⚠️  Article ${article.id} has no slug, skipping`);
        continue;
      }

      // Track revision count
      revisionCounts.set(slug, (revisionCounts.get(slug) || 0) + 1);

      // Keep the version with the latest dateUpdated
      if (!latestArticles.has(slug)) {
        latestArticles.set(slug, article);
      } else {
        const existing = latestArticles.get(slug);
        const existingDate = new Date(existing.dateUpdated);
        const currentDate = new Date(article.dateUpdated);

        if (currentDate > existingDate) {
          latestArticles.set(slug, article);
        }
      }
    } catch (error) {
      console.error(`❌ Error parsing line ${totalRecords}:`, error.message);
    }

    if (totalRecords % 1000 === 0) {
      console.log(`  Processed ${totalRecords} records...`);
    }
  }

  console.log(`✓ Processed ${totalRecords} total records\n`);

  // Convert to array and sort by postDate (newest first)
  const uniqueArticles = Array.from(latestArticles.values()).sort((a, b) => {
    return new Date(b.postDate) - new Date(a.postDate);
  });

  // Write to output file
  console.log(`💾 Writing unique articles to ${OUTPUT_FILE}...`);

  const outputLines = uniqueArticles.map(article => JSON.stringify(article)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, outputLines, 'utf8');

  console.log(`✅ Successfully created ${OUTPUT_FILE}\n`);

  // Statistics
  console.log('📊 Deduplication Statistics:');
  console.log('─'.repeat(60));
  console.log(`Total records in original file:  ${totalRecords}`);
  console.log(`Unique articles extracted:       ${uniqueArticles.length}`);
  console.log(`Duplicates removed:              ${totalRecords - uniqueArticles.length}`);
  console.log(`Average revisions per article:   ${(totalRecords / uniqueArticles.length).toFixed(1)}x`);
  console.log('');

  // Find most-revised articles
  const sortedByRevisions = Array.from(revisionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('📝 Most Revised Articles (Top 10):');
  console.log('─'.repeat(60));
  sortedByRevisions.forEach(([slug, count], index) => {
    const article = latestArticles.get(slug);
    const title = article?.title || 'Unknown';
    console.log(`${index + 1}. ${count} revisions - ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);
  });
  console.log('');

  // Date range
  const dates = uniqueArticles.map(a => new Date(a.postDate));
  const oldestDate = new Date(Math.min(...dates));
  const newestDate = new Date(Math.max(...dates));

  console.log('📅 Date Range:');
  console.log('─'.repeat(60));
  console.log(`Oldest article:  ${oldestDate.toISOString().split('T')[0]}`);
  console.log(`Newest article:  ${newestDate.toISOString().split('T')[0]}`);
  console.log('');

  // Articles by year
  const byYear = {};
  uniqueArticles.forEach(a => {
    const year = new Date(a.postDate).getFullYear();
    byYear[year] = (byYear[year] || 0) + 1;
  });

  console.log('📆 Articles by Year:');
  console.log('─'.repeat(60));
  Object.keys(byYear).sort().forEach(year => {
    console.log(`${year}: ${byYear[year]} articles`);
  });
  console.log('');

  console.log('✨ Deduplication complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

// Run
deduplicateArticles().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
