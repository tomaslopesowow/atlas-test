import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'yacht-data.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'unique-yachts.jsonl');

// Helper to serialize BigInts
function stringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

async function deduplicateYachts() {
  console.log('🔄 Deduplicating yacht data...\n');

  const latestYachts = new Map();
  const revisionCounts = new Map();
  const resaleData = [];
  let totalRecords = 0;
  let resaleRecords = 0;
  let yachtRecords = 0;

  // Read all records
  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('📖 Reading yacht data...');

  for await (const line of rl) {
    totalRecords++;

    try {
      const record = JSON.parse(line);

      // Handle resale data separately (not duplicates, keep all)
      if (record._type === 'resale_brochure_request' || record._type === 'resale_inquiry') {
        resaleData.push(record);
        resaleRecords++;
        continue;
      }

      yachtRecords++;

      // Create unique key: prefer hullNumber, fallback to slug, fallback to id
      let uniqueKey;
      if (record.hullNumber) {
        uniqueKey = `hull:${record.hullNumber}`;
      } else if (record.slug) {
        uniqueKey = `slug:${record.slug}`;
      } else {
        uniqueKey = `id:${record.id}`;
      }

      // Track revision count
      revisionCounts.set(uniqueKey, (revisionCounts.get(uniqueKey) || 0) + 1);

      // Keep the version with the latest dateUpdated
      if (!latestYachts.has(uniqueKey)) {
        latestYachts.set(uniqueKey, record);
      } else {
        const existing = latestYachts.get(uniqueKey);
        const existingDate = new Date(existing.dateUpdated);
        const currentDate = new Date(record.dateUpdated);

        if (currentDate > existingDate) {
          latestYachts.set(uniqueKey, record);
        }
      }
    } catch (error) {
      console.error(`❌ Error parsing line ${totalRecords}:`, error.message);
    }

    if (totalRecords % 10000 === 0) {
      console.log(`  Processed ${totalRecords} records...`);
    }
  }

  console.log(`✓ Processed ${totalRecords} total records`);
  console.log(`  - ${yachtRecords} yacht records`);
  console.log(`  - ${resaleRecords} resale records\n`);

  // Convert to array
  const uniqueYachts = Array.from(latestYachts.values());

  // Sort by hull number (numeric), then by year descending
  uniqueYachts.sort((a, b) => {
    const hullA = a.hullNumber ? parseInt(a.hullNumber) : 999999;
    const hullB = b.hullNumber ? parseInt(b.hullNumber) : 999999;
    if (hullA !== hullB) return hullA - hullB;
    return (b.year || 0) - (a.year || 0);
  });

  // Write to output file (yachts first, then resale data)
  console.log(`💾 Writing unique yachts to ${OUTPUT_FILE}...`);

  const yachtLines = uniqueYachts.map(y => stringify(y));
  const resaleLines = resaleData.map(r => stringify(r));
  const allLines = [...yachtLines, ...resaleLines];

  fs.writeFileSync(OUTPUT_FILE, allLines.join('\n'), 'utf8');

  console.log(`✅ Successfully created ${OUTPUT_FILE}\n`);

  // Statistics
  console.log('📊 Deduplication Statistics:');
  console.log('─'.repeat(60));
  console.log(`Total records in original file:  ${totalRecords}`);
  console.log(`Unique yachts extracted:         ${uniqueYachts.length}`);
  console.log(`Resale records (kept as-is):     ${resaleRecords}`);
  console.log(`Total in output file:            ${uniqueYachts.length + resaleRecords}`);
  console.log(`Yacht duplicates removed:        ${yachtRecords - uniqueYachts.length}`);
  console.log(`Average versions per yacht:      ${(yachtRecords / uniqueYachts.length).toFixed(1)}x`);
  console.log('');

  // Hull number statistics
  const withHullNumbers = uniqueYachts.filter(y => y.hullNumber);
  const withoutHullNumbers = uniqueYachts.filter(y => !y.hullNumber);

  console.log('🔢 Hull Number Coverage:');
  console.log('─'.repeat(60));
  console.log(`Yachts with hull numbers:        ${withHullNumbers.length} (${(withHullNumbers.length / uniqueYachts.length * 100).toFixed(1)}%)`);
  console.log(`Yachts without hull numbers:     ${withoutHullNumbers.length}`);
  console.log('');

  // Most revised yachts
  const sortedByRevisions = Array.from(revisionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('📝 Most Revised Yachts (Top 10):');
  console.log('─'.repeat(60));
  sortedByRevisions.forEach(([key, count], index) => {
    const yacht = latestYachts.get(key);
    const name = yacht?.currentName || yacht?.title || 'Unknown';
    const hull = yacht?.hullNumber || 'N/A';
    console.log(`${index + 1}. ${count} versions - ${name} (hull ${hull})`);
  });
  console.log('');

  // Year distribution
  const byYear = {};
  uniqueYachts.forEach(y => {
    const year = y.year || 'Unknown';
    byYear[year] = (byYear[year] || 0) + 1;
  });

  console.log('📆 Yachts by Year (Top 10):');
  console.log('─'.repeat(60));
  Object.entries(byYear)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([year, count]) => {
      console.log(`${year}: ${count} yachts`);
    });
  console.log('');

  // Sample hull numbers
  const hullNumbers = withHullNumbers
    .map(y => ({ hull: y.hullNumber, name: y.currentName || y.title }))
    .slice(0, 20);

  console.log('🛥️  Sample Hull Numbers (First 20):');
  console.log('─'.repeat(60));
  hullNumbers.forEach(({ hull, name }, index) => {
    console.log(`${index + 1}. ${hull} - ${name || '(no name)'}`);
  });
  if (withHullNumbers.length > 20) {
    console.log(`... and ${withHullNumbers.length - 20} more`);
  }
  console.log('');

  console.log('✨ Deduplication complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

// Run
deduplicateYachts().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
