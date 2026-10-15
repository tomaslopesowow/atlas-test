import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');
const OUTPUT_FILE = path.join(__dirname, 'unique-tags.jsonl');

// Helper function to get parquet file path for a table
function getParquetPath(tableName) {
  return path.join(DB_EXPORT_PATH, `feadship-craft3_prod.${tableName}`, '1', '*.parquet');
}

// Helper function to execute a query and get results
async function query(conn, sql) {
  const reader = await conn.runAndReadAll(sql);
  return reader.getRowObjects();
}

// Helper to serialize BigInts to strings in JSON
function stringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

async function extractTags() {
  console.log('🚀 Extracting all unique tags...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading database tables...');
    const tables = [
      'craft_tags',
      'craft_taggroups',
      'craft_elements',
      'craft_elements_sites',
      'craft_relations'
    ];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
      const count = await query(conn, `SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✓ ${table}: ${count[0].count} rows`);
    }

    console.log('\n📊 Extracting all tags...');

    // Get all tags with their usage counts
    const tags = await query(conn, `
      WITH tag_usage AS (
        SELECT
          r.targetId as tagId,
          COUNT(DISTINCT r.sourceId) as articleCount
        FROM craft_relations r
        INNER JOIN craft_tags t ON r.targetId = t.id
        GROUP BY r.targetId
      )
      SELECT
        t.id,
        t.groupId,
        es.slug,
        es.siteId,
        e.dateCreated,
        tg.name as groupName,
        tg.handle as groupHandle,
        COALESCE(tu.articleCount, 0) as usageCount
      FROM craft_tags t
      INNER JOIN craft_elements e ON t.id = e.id
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      INNER JOIN craft_taggroups tg ON t.groupId = tg.id
      LEFT JOIN tag_usage tu ON t.id = tu.tagId
      WHERE e.dateDeleted IS NULL
      ORDER BY es.siteId, es.slug
    `);

    console.log(`Found ${tags.length} total tag records (across all sites)`);

    // Get unique tags (deduplicate by tag ID)
    const uniqueTagsMap = new Map();
    tags.forEach(tag => {
      const tagId = tag.id.toString();
      if (!uniqueTagsMap.has(tagId)) {
        uniqueTagsMap.set(tagId, {
          id: tagId,
          slug: tag.slug,
          groupId: tag.groupId.toString(),
          groupName: tag.groupName,
          groupHandle: tag.groupHandle,
          usageCount: Number(tag.usageCount),
          dateCreated: tag.dateCreated,
          sites: []
        });
      }
      uniqueTagsMap.get(tagId).sites.push(Number(tag.siteId));
    });

    const uniqueTags = Array.from(uniqueTagsMap.values());
    console.log(`Found ${uniqueTags.length} unique tags`);

    // Sort by usage count (descending) and then by slug
    uniqueTags.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.slug.localeCompare(b.slug);
    });

    // Write to JSONL
    const jsonlContent = uniqueTags.map(tag => stringify(tag)).join('\n');
    await fs.writeFile(OUTPUT_FILE, jsonlContent, 'utf8');

    console.log(`\n✅ Extracted ${uniqueTags.length} unique tags to ${OUTPUT_FILE}`);

    // Show top 20 most used tags
    console.log('\n📈 Top 20 most used tags:');
    uniqueTags.slice(0, 20).forEach((tag, index) => {
      console.log(`  ${index + 1}. ${tag.slug} (${tag.usageCount} articles)`);
    });

    // Show tags with no usage
    const unusedTags = uniqueTags.filter(t => t.usageCount === 0);
    console.log(`\n📊 Statistics:`);
    console.log(`  Total unique tags: ${uniqueTags.length}`);
    console.log(`  Tags with usage: ${uniqueTags.length - unusedTags.length}`);
    console.log(`  Unused tags: ${unusedTags.length}`);

    console.log('\n✨ Extraction complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

// Run
extractTags().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
