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

async function investigateBlockRelations() {
  console.log('🔍 Investigating matrix block relations...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading tables...');
    const tables = [
      'craft_entries',
      'craft_elements_sites',
      'craft_matrixcontent_post_content',
      'craft_matrixblocks_owners',
      'craft_matrixblocks',
      'craft_relations',
      'craft_assets',
      'craft_fields'
    ];
    for (const table of tables) {
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${getParquetPath(table)}')`);
    }
    console.log('✓ Tables loaded\n');

    // Find the article
    console.log('🔎 Finding article...');
    const articles = await query(conn, `
      SELECT e.id
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      WHERE es.slug = 'building-yacht-with-minimal-impact'
        AND es.siteId = 9
    `);

    const articleId = articles[0].id;
    console.log(`Article ID: ${articleId}\n`);

    // Get matrix block IDs for this article
    console.log('📦 Getting matrix blocks...');
    const blockIds = await query(conn, `
      SELECT mbo.blockId, mbo.sortOrder
      FROM craft_matrixblocks_owners mbo
      WHERE mbo.ownerId = ${articleId}
      ORDER BY mbo.sortOrder
    `);

    console.log(`Found ${blockIds.length} blocks\n`);

    // Get the specific block (sortOrder 2) that should have video
    const videoBlock = blockIds.find(b => b.sortOrder === 2);
    if (!videoBlock) {
      console.log('❌ Video block not found!');
      return;
    }

    console.log(`🎥 Investigating block ${videoBlock.blockId} (sortOrder: ${videoBlock.sortOrder})\n`);

    // Check matrix block type
    console.log('📋 Matrix block details:');
    const blockDetails = await query(conn, `
      SELECT mb.*
      FROM craft_matrixblocks mb
      WHERE mb.id = ${videoBlock.blockId}
    `);

    if (blockDetails.length > 0) {
      console.log('  All fields:', Object.keys(blockDetails[0]).join(', '));
      Object.keys(blockDetails[0]).forEach(key => {
        if (blockDetails[0][key] !== null && key !== 'id') {
          console.log(`  ${key}: ${blockDetails[0][key]}`);
        }
      });
      console.log('');
    }

    // Check relations FROM this matrix block
    console.log('🔗 Relations FROM this matrix block:');
    const relationsFrom = await query(conn, `
      SELECT r.*, a.filename, a.kind
      FROM craft_relations r
      LEFT JOIN craft_assets a ON r.targetId = a.id
      WHERE r.sourceId = ${videoBlock.blockId}
      ORDER BY r.fieldId, r.sortOrder
    `);

    if (relationsFrom.length > 0) {
      relationsFrom.forEach(rel => {
        console.log(`  Field ${rel.fieldId}: → Target ${rel.targetId} (${rel.kind || 'not an asset'}) ${rel.filename || ''}`);
      });
      console.log('');
    } else {
      console.log('  No relations found\n');
    }

    // Check all available field IDs in craft_fields
    console.log('📝 All fields in craft_fields:');
    const fields = await query(conn, `
      SELECT id, name, handle, type
      FROM craft_fields
      WHERE handle LIKE '%video%'
         OR handle LIKE '%embed%'
         OR handle LIKE '%media%'
         OR type LIKE '%video%'
         OR type LIKE '%embed%'
      ORDER BY name
    `);

    if (fields.length > 0) {
      fields.forEach(field => {
        console.log(`  ${field.id}: ${field.handle} (${field.name}) - Type: ${field.type}`);
      });
      console.log('');
    }

    // Check if there are other matrixcontent tables
    console.log('🗂️  Checking for other matrixcontent tables...');
    const allTables = await query(conn, `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main'
        AND table_name LIKE '%matrixcontent%'
    `);

    console.log('Available matrixcontent views:');
    allTables.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('');

    // List all fields for this specific matrix block
    console.log('🎯 All content for this specific block:');
    const blockContent = await query(conn, `
      SELECT *
      FROM craft_matrixcontent_post_content
      WHERE elementId = ${videoBlock.blockId}
    `);

    if (blockContent.length > 0) {
      const block = blockContent[0];
      Object.keys(block).forEach(key => {
        if (block[key] !== null) {
          const value = typeof block[key] === 'bigint' ? block[key].toString() : block[key];
          console.log(`  ${key}: ${JSON.stringify(value).substring(0, 200)}`);
        }
      });
    }

    console.log('\n✨ Investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateBlockRelations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
