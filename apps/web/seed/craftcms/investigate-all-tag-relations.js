import { DuckDBConnection } from '@duckdb/node-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');

function getParquetPath(tableName) {
  return path.join(DB_EXPORT_PATH, `feadship-craft3_prod.${tableName}`, '1', '*.parquet');
}

async function query(conn, sql) {
  const reader = await conn.runAndReadAll(sql);
  return reader.getRowObjects();
}

async function investigateAllTagRelations() {
  console.log('🔍 Investigating ALL tag relations for articles with IMAX slug...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading tables...');
    const tables = ['craft_entries', 'craft_elements_sites', 'craft_relations', 'craft_tags'];
    for (const table of tables) {
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${getParquetPath(table)}')`);
    }
    console.log('✓ Tables loaded\n');

    // Get all article IDs with this slug across ALL sites
    console.log('🔎 Finding ALL articles with IMAX slug (all sites)...');
    const allArticles = await query(conn, `
      SELECT DISTINCT
        e.id,
        es.siteId,
        es.slug
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      WHERE es.slug = 'first-imax-theatre-on-a-superyacht'
      ORDER BY es.siteId, e.id
    `);

    console.log(`Found ${allArticles.length} article instances across sites:`);
    const bySite = {};
    allArticles.forEach(a => {
      if (!bySite[a.siteId]) bySite[a.siteId] = [];
      bySite[a.siteId].push(a.id);
    });
    Object.keys(bySite).forEach(siteId => {
      console.log(`  Site ${siteId}: ${bySite[siteId].length} instances`);
    });
    console.log('');

    const allArticleIds = allArticles.map(a => a.id).join(',');

    // Check ALL tag relations (fieldId 476) for these articles, regardless of sourceSiteId
    console.log('🏷️  Checking ALL tag relations (fieldId 476) regardless of sourceSiteId...');
    const allTagRelations = await query(conn, `
      SELECT
        r.sourceId,
        r.sourceSiteId,
        r.targetId as tagId,
        r.fieldId,
        r.sortOrder
      FROM craft_relations r
      WHERE r.sourceId IN (${allArticleIds})
        AND r.fieldId = 476
      ORDER BY r.sourceSiteId, r.sourceId
    `);

    if (allTagRelations.length > 0) {
      console.log(`✅ Found ${allTagRelations.length} tag relations!`);
      console.log('');

      // Group by sourceSiteId
      const bySiteId = {};
      allTagRelations.forEach(rel => {
        if (!bySiteId[rel.sourceSiteId]) bySiteId[rel.sourceSiteId] = [];
        bySiteId[rel.sourceSiteId].push(rel);
      });

      Object.keys(bySiteId).forEach(siteId => {
        console.log(`  sourceSiteId ${siteId}: ${bySiteId[siteId].length} tag relations`);
        bySiteId[siteId].slice(0, 5).forEach(rel => {
          console.log(`    - sourceId: ${rel.sourceId}, tagId: ${rel.tagId}`);
        });
        if (bySiteId[siteId].length > 5) {
          console.log(`    ... and ${bySiteId[siteId].length - 5} more`);
        }
      });
      console.log('');

      // Get tag details
      const tagIds = [...new Set(allTagRelations.map(r => r.tagId))].join(',');
      console.log(`📑 Getting details for ${[...new Set(allTagRelations.map(r => r.tagId))].length} unique tags...`);
      const tags = await query(conn, `
        SELECT
          t.id,
          es.siteId,
          es.slug as tagSlug
        FROM craft_tags t
        INNER JOIN craft_elements_sites es ON t.id = es.elementId
        WHERE t.id IN (${tagIds})
        ORDER BY es.siteId, es.slug
      `);

      console.log('Tags found:');
      tags.forEach(tag => {
        console.log(`  - Tag ID ${tag.id}: "${tag.tagSlug}" (Site ${tag.siteId})`);
      });

    } else {
      console.log('⚠️  NO tag relations found at all for this article across ANY sourceSiteId!');
      console.log('   This confirms the article has no tags in the database.');
    }

    console.log('\n✨ Investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateAllTagRelations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
