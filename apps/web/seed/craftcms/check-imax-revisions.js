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

async function checkImaxRevisions() {
  console.log('🔍 Checking all IMAX article revisions for tag relations...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Load tables
    console.log('📖 Loading tables...');
    const tables = ['craft_entries', 'craft_elements_sites', 'craft_relations', 'craft_tags', 'craft_elements_sites as tag_es'];
    await query(conn, `CREATE VIEW craft_entries AS SELECT * FROM read_parquet('${getParquetPath('craft_entries')}')`);
    await query(conn, `CREATE VIEW craft_elements_sites AS SELECT * FROM read_parquet('${getParquetPath('craft_elements_sites')}')`);
    await query(conn, `CREATE VIEW craft_relations AS SELECT * FROM read_parquet('${getParquetPath('craft_relations')}')`);
    await query(conn, `CREATE VIEW craft_tags AS SELECT * FROM read_parquet('${getParquetPath('craft_tags')}')`);
    console.log('✓ Loaded\n');

    // Get all IMAX article IDs
    const imaxIds = await query(conn, `
      SELECT DISTINCT e.id
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      WHERE es.slug = 'first-imax-theatre-on-a-superyacht'
        AND es.siteId = 9
      ORDER BY e.id DESC
    `);

    console.log(`Found ${imaxIds.length} IMAX article revisions\n`);

    // Check which revisions have tag relations
    const idList = imaxIds.map(row => row.id).join(',');

    const revisionsWithTags = await query(conn, `
      SELECT
        r.sourceId,
        COUNT(DISTINCT r.targetId) as tag_count,
        STRING_AGG(DISTINCT t_es.slug, ', ') as tags
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites t_es ON t.id = t_es.elementId AND t_es.siteId = 9
      WHERE r.sourceId IN (${idList})
        AND r.fieldId = 476
      GROUP BY r.sourceId
      ORDER BY r.sourceId DESC
    `);

    console.log(`Revisions WITH tags: ${revisionsWithTags.length}`);
    if (revisionsWithTags.length > 0) {
      revisionsWithTags.forEach(rev => {
        console.log(`  ID ${rev.sourceId}: ${rev.tag_count} tags - "${rev.tags}"`);
      });
    }
    console.log('');

    // Show revisions WITHOUT tags
    const revisionsWithoutTags = imaxIds.filter(
      row => !revisionsWithTags.some(rev => rev.sourceId === row.id)
    );

    console.log(`Revisions WITHOUT tags: ${revisionsWithoutTags.length}`);
    if (revisionsWithoutTags.length > 0 && revisionsWithoutTags.length <= 10) {
      revisionsWithoutTags.forEach(rev => {
        console.log(`  ID ${rev.id}`);
      });
    } else if (revisionsWithoutTags.length > 10) {
      console.log(`  (Too many to list - ${revisionsWithoutTags.length} revisions)`);
      console.log(`  First: ${revisionsWithoutTags[0].id}, Last: ${revisionsWithoutTags[revisionsWithoutTags.length - 1].id}`);
    }
    console.log('');

    // Find the LATEST revision (highest ID)
    const latestRevision = imaxIds[0].id;
    console.log(`Latest revision ID: ${latestRevision}`);

    const latestRevisionTags = await query(conn, `
      SELECT
        t_es.slug,
        r.sortOrder
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites t_es ON t.id = t_es.elementId AND t_es.siteId = 9
      WHERE r.sourceId = ${latestRevision}
        AND r.fieldId = 476
      ORDER BY r.sortOrder
    `);

    if (latestRevisionTags.length > 0) {
      console.log(`Latest revision HAS tags: ${latestRevisionTags.map(t => t.slug).join(', ')}`);
    } else {
      console.log('Latest revision has NO tags');
    }

    console.log('\n✨ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

checkImaxRevisions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
