import { DuckDBConnection } from '@duckdb/node-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');

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
  , 2);
}

async function investigateAuthorRelations() {
  console.log('Investigating author relations in CraftCMS database...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Create views for all tables we need
    const tables = [
      'craft_entries',
      'craft_elements',
      'craft_elements_sites',
      'craft_content',
      'craft_relations',
      'craft_sections',
      'craft_fields',
      'craft_users',
    ];

    console.log('Loading database tables into DuckDB...');
    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
      const count = await query(conn, `SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  - ${table}: ${count[0].count} rows`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: Find the article entry ID for "making-sense-of-yacht-building-rules"
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 1: Find article entry ID ---');
    const articleEntry = await query(conn, `
      SELECT e.id, e.authorId, es.slug, es.uri
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      WHERE es.slug = 'making-sense-of-yacht-building-rules'
      LIMIT 5
    `);
    console.log('Article entry:', stringify(articleEntry));

    if (articleEntry.length === 0) {
      console.log('Article not found! Exiting.');
      conn.closeSync();
      return;
    }

    const articleId = articleEntry[0].id;
    const cmsAuthorId = articleEntry[0].authorId;

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2: Show who the authorId (CMS creator) is
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 2: CMS author (entry creator) ---');
    const cmsAuthor = await query(conn, `
      SELECT u.id, u.username, u.email, u.firstName, u.lastName
      FROM craft_users u
      WHERE u.id = ${cmsAuthorId}
    `);
    console.log('CMS author (authorId):', stringify(cmsAuthor));

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3: Find ALL relations for this article (not just assets)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 3: All relations for this article ---');
    const allRelations = await query(conn, `
      SELECT
        r.fieldId,
        r.targetId,
        r.sortOrder,
        el.type as targetElementType,
        es.slug as targetSlug,
        es.uri as targetUri,
        f.name as fieldName,
        f.handle as fieldHandle,
        f.type as fieldType
      FROM craft_relations r
      INNER JOIN craft_elements el ON r.targetId = el.id
      LEFT JOIN craft_elements_sites es ON r.targetId = es.elementId
      LEFT JOIN craft_fields f ON r.fieldId = f.id
      WHERE r.sourceId = ${articleId}
      ORDER BY r.fieldId, r.sortOrder
    `);
    console.log(`Found ${allRelations.length} relations:`);
    console.log(stringify(allRelations));

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4: Look for User-type targets specifically
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 4: Relations targeting User elements ---');
    const userRelations = allRelations.filter(r =>
      r.targetElementType === 'craft\\elements\\User'
    );

    if (userRelations.length > 0) {
      console.log(`Found ${userRelations.length} User relations:`);
      console.log(stringify(userRelations));

      // Get the user details for each target
      for (const rel of userRelations) {
        const userDetails = await query(conn, `
          SELECT
            u.id, u.username, u.email, u.firstName, u.lastName,
            c.field_user_firstName, c.field_user_lastName, c.field_user_title
          FROM craft_users u
          LEFT JOIN craft_content c ON u.id = c.elementId
          WHERE u.id = ${rel.targetId}
        `);
        console.log(`\nUser details for targetId ${rel.targetId}:`);
        console.log(stringify(userDetails));
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 5: Check coverage of this fieldId across all articles
      // ─────────────────────────────────────────────────────────────────────
      const authorFieldId = userRelations[0].fieldId;
      console.log(`\n--- Step 5: Coverage analysis for fieldId ${authorFieldId} ---`);

      const coverage = await query(conn, `
        SELECT COUNT(DISTINCT r.sourceId) as articlesWithAuthorRelation
        FROM craft_relations r
        WHERE r.fieldId = ${authorFieldId}
      `);
      console.log('Articles with author relation:', stringify(coverage));

      // Show a sample of article → author mappings
      console.log('\nSample article-to-author mappings (first 20):');
      const sampleMappings = await query(conn, `
        SELECT
          r.sourceId as articleId,
          r.targetId as authorUserId,
          es_article.slug as articleSlug,
          u.firstName,
          u.lastName,
          c.field_user_firstName,
          c.field_user_lastName,
          c.field_user_title
        FROM craft_relations r
        INNER JOIN craft_elements_sites es_article ON r.sourceId = es_article.elementId
        LEFT JOIN craft_users u ON r.targetId = u.id
        LEFT JOIN craft_content c ON r.targetId = c.elementId
        WHERE r.fieldId = ${authorFieldId}
        ORDER BY r.sourceId
        LIMIT 20
      `);
      console.log(stringify(sampleMappings));

      console.log(`\n========================================`);
      console.log(`RESULT: Author relation fieldId = ${authorFieldId}`);
      console.log(`Field name: ${userRelations[0].fieldName}`);
      console.log(`Field handle: ${userRelations[0].fieldHandle}`);
      console.log(`========================================`);

    } else {
      console.log('No User-type relations found for this article.');
      console.log('The authorId field might be the only author reference.');

      // ─────────────────────────────────────────────────────────────────────
      // Additional: Check if there's any field that references Users at all
      // ─────────────────────────────────────────────────────────────────────
      console.log('\n--- Additional: Fields that reference User elements anywhere ---');
      const userRefFields = await query(conn, `
        SELECT DISTINCT
          r.fieldId,
          f.name as fieldName,
          f.handle as fieldHandle,
          f.type as fieldType,
          COUNT(*) as relationCount
        FROM craft_relations r
        INNER JOIN craft_elements el ON r.targetId = el.id
        LEFT JOIN craft_fields f ON r.fieldId = f.id
        WHERE el.type = 'craft\\elements\\User'
        GROUP BY r.fieldId, f.name, f.handle, f.type
        ORDER BY relationCount DESC
      `);
      console.log(stringify(userRefFields));
    }

    conn.closeSync();

  } catch (error) {
    console.error('Error during investigation:', error);
    conn.closeSync();
    throw error;
  }
}

investigateAuthorRelations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
