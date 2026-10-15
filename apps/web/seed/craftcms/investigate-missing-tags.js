import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
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

function stringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
}

async function investigateMissingTags() {
  console.log('🔍 Investigating missing tags for IMAX article...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Load tables
    console.log('📖 Loading database tables...');
    const tables = ['craft_entries', 'craft_elements', 'craft_elements_sites', 'craft_content', 'craft_relations', 'craft_tags', 'craft_taggroups'];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
    }
    console.log('✓ Tables loaded\n');

    // Find the article
    console.log('🔎 Finding IMAX article by slug...');
    const articles = await query(conn, `
      SELECT
        e.id,
        es.siteId,
        es.slug,
        c.title
      FROM craft_entries e
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      LEFT JOIN craft_content c ON e.id = c.elementId
      WHERE es.slug = 'first-imax-theatre-on-a-superyacht'
      ORDER BY es.siteId
    `);

    console.log(`Found ${articles.length} instances of this article:`);
    articles.forEach(a => {
      console.log(`  - ID: ${a.id}, Site: ${a.siteId}, Title: ${a.title}`);
    });
    console.log('');

    if (articles.length === 0) {
      console.log('❌ Article not found!');
      return;
    }

    const articleIds = articles.map(a => a.id);
    const articleIdsList = articleIds.join(',');

    // Check relations table structure
    console.log('📋 Checking craft_relations table structure...');
    const relSample = await query(conn, `SELECT * FROM craft_relations LIMIT 1`);
    if (relSample.length > 0) {
      console.log('Columns in craft_relations:');
      console.log('  ' + Object.keys(relSample[0]).join(', '));
      console.log('');
    }

    // Check for tag relations (fieldId 476)
    console.log('🏷️  Checking tag relations for this article (fieldId 476)...');
    const tagRelations = await query(conn, `
      SELECT
        r.*
      FROM craft_relations r
      WHERE r.sourceId IN (${articleIdsList})
        AND r.fieldId = 476
      ORDER BY r.sourceId
    `);

    if (tagRelations.length > 0) {
      console.log(`Found ${tagRelations.length} tag relations:`);
      tagRelations.forEach(rel => {
        console.log(stringify(rel));
      });
      console.log('');

      // Get the tag details
      console.log('📑 Getting tag details...');
      const tagIds = tagRelations.map(r => r.targetId).join(',');

      const tags = await query(conn, `
        SELECT
          t.id as tagId,
          es.siteId,
          es.slug as tagSlug,
          es.enabled,
          tg.name as groupName,
          tg.handle as groupHandle
        FROM craft_tags t
        INNER JOIN craft_elements el ON t.id = el.id
        INNER JOIN craft_elements_sites es ON t.id = es.elementId
        INNER JOIN craft_taggroups tg ON t.groupId = tg.id
        WHERE t.id IN (${tagIds})
          AND el.dateDeleted IS NULL
        ORDER BY es.siteId, es.slug
      `);

      console.log(`Found ${tags.length} tag records across sites:`);
      tags.forEach(tag => {
        console.log(`  - Tag: "${tag.tagSlug}", Site: ${tag.siteId}, Enabled: ${tag.enabled}, Group: ${tag.groupName}`);
      });
      console.log('');

      // Check which article sites match which tag sites
      console.log('🔗 Matching article sites with tag sites...');
      for (const article of articles) {
        const matchingTags = tags.filter(t => t.siteId === article.siteId);
        console.log(`  Article ${article.id} (Site ${article.siteId}):`);
        if (matchingTags.length > 0) {
          matchingTags.forEach(tag => {
            console.log(`    ✓ Has tag: "${tag.tagSlug}"`);
          });
        } else {
          console.log(`    ⚠️  No tags for this site`);
          const otherSiteTags = tags.filter(t => t.siteId !== article.siteId);
          if (otherSiteTags.length > 0) {
            console.log(`    Note: Tags exist in other sites:`);
            otherSiteTags.forEach(tag => {
              console.log(`      - "${tag.tagSlug}" (Site ${tag.siteId})`);
            });
          }
        }
      }
      console.log('');

    } else {
      console.log('⚠️  NO tag relations found for this article in craft_relations!');
      console.log('   This means the article genuinely has no tags assigned.');
      console.log('');

      // Check if there are any relations at all for this article
      console.log('📊 Checking all relations for this article...');
      const allRelations = await query(conn, `
        SELECT
          r.fieldId,
          COUNT(*) as count
        FROM craft_relations r
        WHERE r.sourceId IN (${articleIdsList})
        GROUP BY r.fieldId
        ORDER BY count DESC
      `);

      if (allRelations.length > 0) {
        console.log(`Found ${allRelations.length} different field types with relations:`);
        allRelations.forEach(rel => {
          console.log(`  - Field ${rel.fieldId}: ${rel.count} relations`);
        });
      } else {
        console.log('  No relations found at all for this article.');
      }
    }

    console.log('\n✨ Investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateMissingTags().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
