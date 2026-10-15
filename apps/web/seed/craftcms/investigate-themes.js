import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');
const ARTICLES_FILE = path.join(__dirname, 'unique-articles.jsonl');

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

async function investigateThemes() {
  console.log('🔍 Investigating "themes" in CraftCMS database...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Load siteId 9 article IDs
    console.log('📖 Loading siteId 9 articles...');
    const articlesContent = await fs.readFile(ARTICLES_FILE, 'utf8');
    const articles = articlesContent.trim().split('\n')
      .map(line => JSON.parse(line))
      .filter(a => a.siteId === 9);

    const site9ArticleIds = articles.map(a => a.id);
    console.log(`  Found ${articles.length} articles with siteId 9\n`);

    // Load required tables
    console.log('📖 Loading database tables...');
    const tables = [
      'craft_fields',
      'craft_content',
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

    // 1. Search for fields with "theme" in name/handle
    console.log('\n🔎 Searching for fields with "theme" in name or handle...');
    const themeFields = await query(conn, `
      SELECT
        id,
        name,
        handle,
        type,
        settings
      FROM craft_fields
      WHERE LOWER(name) LIKE '%theme%'
         OR LOWER(handle) LIKE '%theme%'
      ORDER BY name
    `);

    if (themeFields.length > 0) {
      console.log(`Found ${themeFields.length} fields with "theme":`);
      themeFields.forEach(f => {
        console.log(`  - ${f.name} (${f.handle}) [ID: ${f.id}, Type: ${f.type}]`);
      });
    } else {
      console.log('  No fields with "theme" found');
    }

    // 2. Search for fields with taxonomy-related names
    console.log('\n🔎 Searching for taxonomy/category fields...');
    const taxonomyFields = await query(conn, `
      SELECT
        id,
        name,
        handle,
        type,
        settings
      FROM craft_fields
      WHERE LOWER(handle) LIKE '%tax%'
         OR LOWER(handle) LIKE '%cat%'
         OR LOWER(handle) LIKE '%tag%'
         OR type IN ('craft\\\\fields\\\\Tags', 'craft\\\\fields\\\\Categories')
      ORDER BY name
    `);

    if (taxonomyFields.length > 0) {
      console.log(`Found ${taxonomyFields.length} taxonomy-related fields:`);
      taxonomyFields.forEach(f => {
        console.log(`  - ${f.name} (${f.handle}) [ID: ${f.id}, Type: ${f.type}]`);
      });
    }

    // 3. Check craft_content table columns
    console.log('\n🔎 Checking craft_content table structure...');
    const contentSample = await query(conn, `SELECT * FROM craft_content LIMIT 1`);
    if (contentSample.length > 0) {
      const columns = Object.keys(contentSample[0]);
      const themeColumns = columns.filter(c => c.toLowerCase().includes('theme') || c.toLowerCase().includes('tax'));

      if (themeColumns.length > 0) {
        console.log('Found potential theme/taxonomy columns in craft_content:');
        themeColumns.forEach(col => {
          console.log(`  - ${col}`);
        });

        // Sample data from these columns for siteId 9 articles
        if (site9ArticleIds.length > 0) {
          const site9IdsList = site9ArticleIds.join(',');
          for (const col of themeColumns.slice(0, 3)) { // Check first 3 columns
            console.log(`\n  Sampling ${col} for siteId 9 articles:`);
            const samples = await query(conn, `
              SELECT
                cc.elementId,
                cc.${col}
              FROM craft_content cc
              WHERE cc.elementId IN (${site9IdsList})
                AND cc.${col} IS NOT NULL
              LIMIT 10
            `);
            if (samples.length > 0) {
              samples.forEach(s => {
                console.log(`    Article ${s.elementId}: ${s[col]}`);
              });
            } else {
              console.log(`    (no non-null values found)`);
            }
          }
        }
      } else {
        console.log('  No theme/taxonomy columns found in craft_content');
        console.log(`  Total columns: ${columns.length}`);
        console.log('  Sample columns:', columns.slice(0, 20).join(', '));
      }
    }

    // 4. Check tags (maybe themes are stored as tags)
    console.log('\n🔎 Investigating tags as potential themes...');
    const tagGroups = await query(conn, `
      SELECT
        id,
        name,
        handle
      FROM craft_taggroups
      ORDER BY name
    `);

    console.log(`Found ${tagGroups.length} tag group(s):`);
    tagGroups.forEach(g => {
      console.log(`  - ${g.name} (${g.handle}) [ID: ${g.id}]`);
    });

    // Get tags and check for theme-like names
    const tags = await query(conn, `
      SELECT
        t.id,
        t.groupId,
        es.slug,
        es.siteId
      FROM craft_tags t
      INNER JOIN craft_elements e ON t.id = e.id
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      WHERE e.dateDeleted IS NULL
        AND es.siteId = 9
      ORDER BY es.slug
    `);

    console.log(`\nFound ${tags.length} tags for siteId 9:`);
    if (tags.length > 0) {
      const expectedThemes = ['building', 'opinion', 'innovation', 'sustainability', 'design'];
      const matchingTags = tags.filter(t =>
        expectedThemes.some(theme => t.slug.toLowerCase().includes(theme))
      );

      if (matchingTags.length > 0) {
        console.log('\n✅ Found matching theme tags:');
        matchingTags.forEach(t => {
          console.log(`  - ${t.slug} [ID: ${t.id}, Group: ${t.groupId}]`);
        });
      }

      // Show all tags
      console.log('\nAll tags:');
      tags.forEach(t => {
        console.log(`  - ${t.slug} [ID: ${t.id}]`);
      });
    }

    // 5. Check tag relations for siteId 9 articles
    if (site9ArticleIds.length > 0) {
      console.log('\n🔎 Checking tag relations for siteId 9 articles...');
      const site9IdsList = site9ArticleIds.join(',');

      const tagRelations = await query(conn, `
        SELECT
          r.sourceId,
          r.targetId,
          r.fieldId,
          es.slug as tagSlug,
          t.groupId
        FROM craft_relations r
        INNER JOIN craft_tags t ON r.targetId = t.id
        INNER JOIN craft_elements_sites es ON t.id = es.elementId AND es.siteId = 9
        WHERE r.sourceId IN (${site9IdsList})
        ORDER BY r.sourceId
      `);

      console.log(`Found ${tagRelations.length} tag relations for siteId 9 articles`);

      if (tagRelations.length > 0) {
        // Count by tag
        const byTag = {};
        tagRelations.forEach(r => {
          byTag[r.tagSlug] = (byTag[r.tagSlug] || 0) + 1;
        });

        console.log('\nArticle count by tag:');
        Object.keys(byTag).sort().forEach(tag => {
          console.log(`  ${tag}: ${byTag[tag]} articles`);
        });

        // Count by field ID
        const byFieldId = {};
        tagRelations.forEach(r => {
          byFieldId[r.fieldId] = (byFieldId[r.fieldId] || 0) + 1;
        });

        console.log('\nTag relations by field ID:');
        Object.keys(byFieldId).forEach(fieldId => {
          console.log(`  Field ${fieldId}: ${byFieldId[fieldId]} relations`);
        });

        // Sample mappings
        console.log('\nSample article → tag mappings (first 20):');
        tagRelations.slice(0, 20).forEach(r => {
          const article = articles.find(a => a.id === parseInt(r.sourceId));
          const articleTitle = article ? article.title.substring(0, 50) : 'Unknown';
          console.log(`  "${articleTitle}" → ${r.tagSlug}`);
        });

        // Save detailed results
        const report = {
          summary: {
            totalSite9Articles: articles.length,
            articlesWithTags: new Set(tagRelations.map(r => parseInt(r.sourceId))).size,
            totalTagRelations: tagRelations.length
          },
          themeFields,
          taxonomyFields,
          tagGroups,
          tags,
          tagRelations: tagRelations.map(r => ({
            articleId: r.sourceId.toString(),
            tagId: r.targetId.toString(),
            tagSlug: r.tagSlug,
            fieldId: r.fieldId.toString()
          }))
        };

        await fs.writeFile(
          path.join(__dirname, 'theme-investigation-report.json'),
          stringify(report, null, 2),
          'utf8'
        );
        console.log('\n✅ Report saved to theme-investigation-report.json');
      }
    }

    console.log('\n✨ Theme investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

// Run
investigateThemes().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
