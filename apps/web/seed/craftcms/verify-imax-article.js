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

async function verifyImaxArticle() {
  console.log('🔍 Verifying IMAX article details...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Load tables
    console.log('📖 Loading tables...');
    const tables = ['craft_entries', 'craft_elements', 'craft_elements_sites', 'craft_content', 'craft_relations'];
    for (const table of tables) {
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${getParquetPath(table)}')`);
    }
    console.log('✓ Loaded\n');

    // Find ALL entries with IMAX in title or slug
    console.log('Query 1: Find ALL entries with "IMAX" in title or slug:');
    console.log('-'.repeat(80));
    const imaxEntries = await query(conn, `
      SELECT
        e.id,
        es.siteId,
        es.slug,
        es.enabled,
        c.title
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      LEFT JOIN craft_content c ON e.id = c.elementId AND c.siteId = es.siteId
      WHERE LOWER(c.title) LIKE '%imax%' OR LOWER(es.slug) LIKE '%imax%'
      ORDER BY e.id, es.siteId
    `);

    console.log(`Found ${imaxEntries.length} entries:`);
    imaxEntries.forEach(entry => {
      console.log(`  ID: ${entry.id}, Site: ${entry.siteId}, Slug: "${entry.slug}", Enabled: ${entry.enabled}`);
      console.log(`    Title: "${entry.title}"`);
    });
    console.log('');

    // Check if ID 12258957 exists and its status
    console.log('Query 2: Details for article ID 12258957:');
    console.log('-'.repeat(80));
    const specificArticle = await query(conn, `
      SELECT
        e.id,
        el.dateDeleted,
        el.dateCreated,
        el.dateUpdated,
        es.siteId,
        es.slug,
        es.enabled,
        c.title
      FROM craft_entries e
      INNER JOIN craft_elements el ON e.id = el.id
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      LEFT JOIN craft_content c ON e.id = c.elementId AND c.siteId = es.siteId
      WHERE e.id = 12258957
      ORDER BY es.siteId
    `);

    if (specificArticle.length > 0) {
      console.log(`Found ${specificArticle.length} site entries for article 12258957:`);
      specificArticle.forEach(article => {
        console.log(`  Site ${article.siteId}: "${article.slug}", Enabled: ${article.enabled}`);
        console.log(`    Title: "${article.title}"`);
        console.log(`    Deleted: ${article.dateDeleted}, Updated: ${article.dateUpdated}`);
      });
    } else {
      console.log('  Article ID 12258957 NOT FOUND!');
    }
    console.log('');

    // Check ALL relations for article 12258957
    console.log('Query 3: ALL relations for article 12258957:');
    console.log('-'.repeat(80));
    const allRelations = await query(conn, `
      SELECT
        r.sourceId,
        r.fieldId,
        r.targetId,
        r.sortOrder,
        r.sourceSiteId,
        COUNT(*) as count
      FROM craft_relations r
      WHERE r.sourceId = 12258957
      GROUP BY r.sourceId, r.fieldId, r.targetId, r.sortOrder, r.sourceSiteId
      ORDER BY r.fieldId, r.sortOrder
    `);

    if (allRelations.length > 0) {
      console.log(`Found ${allRelations.length} relations:`);
      allRelations.forEach(rel => {
        console.log(`  Field ${rel.fieldId}: target=${rel.targetId}, sort=${rel.sortOrder}, sourceSiteId=${rel.sourceSiteId}`);
      });
    } else {
      console.log('  NO relations found for article 12258957');
    }
    console.log('');

    // Check articles that show on production with design tag
    console.log('Query 4: Sample of articles WITH "design" tag (siteId 9):');
    console.log('-'.repeat(80));
    const articlesWithDesign = await query(conn, `
      SELECT
        e.id,
        es.slug,
        c.title,
        r.targetId as tagId,
        r.sortOrder,
        e.dateUpdated
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      LEFT JOIN craft_content c ON e.id = c.elementId AND c.siteId = es.siteId
      INNER JOIN craft_relations r ON e.id = r.sourceId
      WHERE r.fieldId = 476
        AND r.targetId = 2253968
        AND es.siteId = 9
      LIMIT 10
    `);

    console.log(`Found ${articlesWithDesign.length} articles with "design" tag:`);
    articlesWithDesign.forEach(article => {
      console.log(`  ${article.slug} (ID: ${article.id})`);
      console.log(`    Updated: ${article.dateUpdated}`);
    });

    console.log('\n✨ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

verifyImaxArticle().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
