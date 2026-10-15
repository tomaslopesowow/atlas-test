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

function stringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
}

async function investigateTagSites() {
  console.log('='.repeat(80));
  console.log('INVESTIGATION: Missing "design" tag for IMAX article');
  console.log('='.repeat(80));
  console.log('Article ID: 12258957');
  console.log('Design Tag ID: 2253968');
  console.log('Field ID: 476 (post_tags)');
  console.log('');

  const conn = await DuckDBConnection.create();

  try {
    // Load tables
    console.log('📖 Loading database tables...');
    const tables = ['craft_entries', 'craft_elements', 'craft_elements_sites', 'craft_relations', 'craft_tags', 'craft_taggroups'];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
    }
    console.log('✓ Tables loaded\n');

    // Query 1: Check which siteIds the "design" tag exists for
    console.log('Query 1: Which siteIds does the "design" tag (2253968) exist for?');
    console.log('-'.repeat(80));
    const tagSites = await query(conn, `
      SELECT es.elementId, es.siteId, es.slug, es.enabled
      FROM craft_elements_sites es
      WHERE es.elementId = 2253968
      ORDER BY es.siteId
    `);
    console.log('Results:');
    tagSites.forEach(site => {
      console.log(`  - siteId: ${site.siteId}, slug: "${site.slug}", enabled: ${site.enabled}`);
    });
    console.log('');

    // Query 2: Check if relation exists without site filter
    console.log('Query 2: Does relation exist for IMAX article -> design tag (no site filter)?');
    console.log('-'.repeat(80));
    const relationCheck = await query(conn, `
      SELECT
        r.*,
        a_es.siteId as article_siteId,
        a_es.slug as article_slug
      FROM craft_relations r
      INNER JOIN craft_elements_sites a_es ON r.sourceId = a_es.elementId
      WHERE r.sourceId = 12258957
        AND r.fieldId = 476
        AND r.targetId = 2253968
    `);
    console.log(`Results: ${relationCheck.length} rows found`);
    if (relationCheck.length > 0) {
      relationCheck.forEach(rel => {
        console.log(`  - sourceId: ${rel.sourceId}, targetId: ${rel.targetId}, sourceSiteId: ${rel.sourceSiteId}, article_siteId: ${rel.article_siteId}`);
      });
    }
    console.log('');

    // Query 3: Check ALL relations for IMAX article with sourceSiteId
    console.log('Query 3: All tag relations for IMAX article (checking sourceSiteId):');
    console.log('-'.repeat(80));
    const allImaxRelations = await query(conn, `
      SELECT
        r.sourceId,
        r.targetId,
        r.fieldId,
        r.sortOrder,
        r.sourceSiteId,
        t_es.slug as tag_slug,
        t_es.siteId as tag_siteId,
        a_es.siteId as article_siteId,
        a_es.slug as article_slug
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites a_es ON r.sourceId = a_es.elementId
      LEFT JOIN craft_elements_sites t_es ON t.id = t_es.elementId AND t_es.siteId = r.sourceSiteId
      WHERE r.sourceId = 12258957
        AND r.fieldId = 476
      ORDER BY r.sortOrder
    `);
    console.log(`Results: ${allImaxRelations.length} rows found`);
    allImaxRelations.forEach(rel => {
      console.log(`  - tag: "${rel.tag_slug}", sourceSiteId: ${rel.sourceSiteId}, tag_siteId: ${rel.tag_siteId}, article_siteId: ${rel.article_siteId}`);
    });
    console.log('');

    // Query 4: Find articles that DO have design tag successfully (with current query logic)
    console.log('Query 4: Articles that DO have "design" tag (current extraction logic):');
    console.log('-'.repeat(80));
    const workingArticles = await query(conn, `
      SELECT
        r.sourceId,
        r.sourceSiteId,
        a_es.siteId as article_siteId,
        a_es.slug as article_slug,
        t_es.siteId as tag_siteId,
        t_es.slug as tag_slug
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites a_es ON r.sourceId = a_es.elementId
      INNER JOIN craft_elements_sites t_es ON t.id = t_es.elementId
        AND t_es.siteId = a_es.siteId
      WHERE r.fieldId = 476
        AND t_es.slug = 'design'
        AND a_es.siteId = 9
      LIMIT 5
    `);
    console.log(`Results: ${workingArticles.length} articles found`);
    workingArticles.forEach(article => {
      console.log(`  - ${article.article_slug}: sourceSiteId=${article.sourceSiteId}, article_siteId=${article.article_siteId}, tag_siteId=${article.tag_siteId}`);
    });
    console.log('');

    // Query 5: Same as Query 4 but using sourceSiteId
    console.log('Query 5: Articles with "design" tag (using sourceSiteId logic):');
    console.log('-'.repeat(80));
    const sourceSiteIdArticles = await query(conn, `
      SELECT
        r.sourceId,
        r.sourceSiteId,
        a_es.siteId as article_siteId,
        a_es.slug as article_slug,
        t_es.siteId as tag_siteId,
        t_es.slug as tag_slug
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites a_es ON r.sourceId = a_es.elementId
      INNER JOIN craft_elements_sites t_es ON t.id = t_es.elementId
        AND t_es.siteId = r.sourceSiteId
      WHERE r.fieldId = 476
        AND t_es.slug = 'design'
        AND a_es.siteId = 9
      LIMIT 5
    `);
    console.log(`Results: ${sourceSiteIdArticles.length} articles found`);
    sourceSiteIdArticles.forEach(article => {
      console.log(`  - ${article.article_slug}: sourceSiteId=${article.sourceSiteId}, article_siteId=${article.article_siteId}, tag_siteId=${article.tag_siteId}`);
    });
    console.log('');

    // Query 6: Count comparison
    console.log('Query 6: Count comparison between current vs sourceSiteId approach:');
    console.log('-'.repeat(80));

    const currentCount = await query(conn, `
      SELECT COUNT(DISTINCT r.sourceId) as article_count
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites a_es ON r.sourceId = a_es.elementId
      INNER JOIN craft_elements_sites t_es ON t.id = t_es.elementId
        AND t_es.siteId = a_es.siteId
      WHERE r.fieldId = 476
        AND a_es.siteId = 9
    `);

    const sourceSiteIdCount = await query(conn, `
      SELECT COUNT(DISTINCT r.sourceId) as article_count
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements_sites a_es ON r.sourceId = a_es.elementId
      INNER JOIN craft_elements_sites t_es ON t.id = t_es.elementId
        AND t_es.siteId = r.sourceSiteId
      WHERE r.fieldId = 476
        AND a_es.siteId = 9
    `);

    console.log('Current logic (tag_es.siteId = article_es.siteId):');
    console.log(`  Articles with tags (siteId 9): ${currentCount[0].article_count}`);
    console.log('');
    console.log('Proposed logic (tag_es.siteId = r.sourceSiteId):');
    console.log(`  Articles with tags (siteId 9): ${sourceSiteIdCount[0].article_count}`);
    console.log(`  Improvement: +${sourceSiteIdCount[0].article_count - currentCount[0].article_count} articles`);
    console.log('');

    console.log('='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));

    // Analyze the results
    const hasRelation = relationCheck.length > 0;
    const tagHasSite9 = tagSites.some(site => site.siteId === 9);

    console.log(`1. Relation exists: ${hasRelation ? 'YES' : 'NO'}`);
    if (hasRelation) {
      console.log(`   sourceSiteId in relation: ${relationCheck[0].sourceSiteId}`);
    }
    console.log('');

    console.log(`2. Design tag has siteId 9 entry: ${tagHasSite9 ? 'YES' : 'NO'}`);
    console.log(`   Design tag exists for siteIds: ${tagSites.map(s => s.siteId).join(', ')}`);
    console.log('');

    console.log('3. Current query impact:');
    console.log('   - Uses article_es.siteId to join tag_es');
    console.log(`   - Articles with tags: ${currentCount[0].article_count}`);
    console.log('');

    console.log('4. Proposed fix impact:');
    console.log('   - Use r.sourceSiteId to join tag_es');
    console.log(`   - Articles with tags: ${sourceSiteIdCount[0].article_count}`);
    console.log(`   - Improvement: +${sourceSiteIdCount[0].article_count - currentCount[0].article_count} articles`);
    console.log('');

    console.log('RECOMMENDATION:');
    if (sourceSiteIdCount[0].article_count > currentCount[0].article_count) {
      console.log('✓ Update extract-news-articles.js to use r.sourceSiteId instead of article_es.siteId');
      console.log('  Change line ~320:');
      console.log('  FROM: INNER JOIN craft_elements_sites tag_es ON t.id = tag_es.elementId AND tag_es.siteId = article_es.siteId');
      console.log('  TO:   INNER JOIN craft_elements_sites tag_es ON t.id = tag_es.elementId AND tag_es.siteId = r.sourceSiteId');
    } else if (currentCount[0].article_count === sourceSiteIdCount[0].article_count) {
      console.log('⚠ Both approaches yield same results. Further investigation needed.');
    } else {
      console.log('⚠ sourceSiteId approach yields fewer results. Review data manually.');
    }

    console.log('\n✨ Investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateTagSites().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
