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

async function investigateContentBlocks() {
  console.log('🔍 Investigating content blocks for "building-yacht-with-minimal-impact"...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading tables...');
    const tables = ['craft_entries', 'craft_elements_sites', 'craft_matrixcontent_post_content', 'craft_matrixblocks_owners'];
    for (const table of tables) {
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${getParquetPath(table)}')`);
    }
    console.log('✓ Tables loaded\n');

    // Find the article
    console.log('🔎 Finding article by slug...');
    const articles = await query(conn, `
      SELECT e.id, es.siteId, es.slug
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      WHERE es.slug = 'building-yacht-with-minimal-impact'
        AND es.siteId = 9
    `);

    if (articles.length === 0) {
      console.log('❌ Article not found!');
      return;
    }

    const article = articles[0];
    console.log(`Found article ID: ${article.id}\n`);

    // Get ALL columns from craft_matrixcontent_post_content
    console.log('📋 Examining craft_matrixcontent_post_content structure...');
    const sample = await query(conn, `
      SELECT * FROM craft_matrixcontent_post_content LIMIT 1
    `);

    if (sample.length > 0) {
      console.log('Available columns:');
      const columns = Object.keys(sample[0]);
      columns.forEach(col => console.log(`  - ${col}`));
      console.log('');
    }

    // Get content blocks for this article
    console.log('🎬 Getting content blocks for this article...');
    const blocks = await query(conn, `
      SELECT mcp.*, mbo.sortOrder
      FROM craft_matrixblocks_owners mbo
      INNER JOIN craft_matrixcontent_post_content mcp ON mbo.blockId = mcp.elementId
      WHERE mbo.ownerId = ${article.id}
        AND mcp.siteId = 9
      ORDER BY mbo.sortOrder
    `);

    console.log(`Found ${blocks.length} content blocks\n`);

    // Show blocks with mostly null values (likely media blocks)
    console.log('🎥 Blocks with mostly null text content (likely media):');
    blocks.forEach((block, index) => {
      const hasTextContent = !!block.field_text_text;
      const hasQuote = !!block.field_quote_text;

      if (!hasTextContent && !hasQuote) {
        console.log(`\n--- Block ${index + 1} (sortOrder: ${block.sortOrder}) ---`);
        // Show all non-null, non-date, non-id fields
        Object.keys(block).forEach(key => {
          const value = block[key];
          if (value !== null &&
              !key.includes('date') &&
              !key.includes('Date') &&
              key !== 'id' &&
              key !== 'elementId' &&
              key !== 'siteId' &&
              key !== 'sortOrder') {
            console.log(`  ${key}: ${JSON.stringify(value).substring(0, 100)}`);
          }
        });
      }
    });

    console.log('\n✨ Investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateContentBlocks().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
