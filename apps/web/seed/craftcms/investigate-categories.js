import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');
const ARTICLES_FILE = path.join(__dirname, 'unique-articles.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'category-taxonomy-report.json');

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

async function investigateCategories() {
  console.log('🔍 Investigating article categories and taxonomies...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Load siteId 9 article IDs from the extracted data
    console.log('📖 Loading siteId 9 articles from unique-articles.jsonl...');
    const articlesContent = await fs.readFile(ARTICLES_FILE, 'utf8');
    const articles = articlesContent.trim().split('\n')
      .map(line => JSON.parse(line))
      .filter(a => a.siteId === 9);

    const site9ArticleIds = articles.map(a => a.id);
    console.log(`  Found ${articles.length} articles with siteId 9\n`);

    console.log('📖 Loading database tables into DuckDB...');

    // Create views for all tables we need
    const tables = [
      'craft_categories',
      'craft_categorygroups',
      'craft_categorygroups_sites',
      'craft_elements',
      'craft_elements_sites',
      'craft_relations',
      'craft_tags',
      'craft_taggroups'
    ];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
      const count = await query(conn, `SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✓ ${table}: ${count[0].count} rows`);
    }

    console.log('\n🏷️  Analyzing category groups...');

    // Get all category groups
    const categoryGroups = await query(conn, `
      SELECT
        cg.id,
        cg.name,
        cg.handle,
        cg.uid
      FROM craft_categorygroups cg
      ORDER BY cg.name
    `);

    console.log(`Found ${categoryGroups.length} category groups:`);
    categoryGroups.forEach(g => {
      console.log(`  - ${g.name} (${g.handle}) [ID: ${g.id}]`);
    });

    console.log('\n📁 Analyzing categories...');

    // First, check what columns are available in craft_elements_sites
    const esColumns = await query(conn, `
      SELECT * FROM craft_elements_sites LIMIT 1
    `);
    console.log('Sample craft_elements_sites columns:', Object.keys(esColumns[0] || {}));

    // Get all categories with their titles
    const categories = await query(conn, `
      SELECT
        c.id,
        c.groupId,
        es.slug,
        es.siteId,
        e.dateCreated,
        cg.name as groupName,
        cg.handle as groupHandle
      FROM craft_categories c
      INNER JOIN craft_elements e ON c.id = e.id
      INNER JOIN craft_elements_sites es ON e.id = es.elementId
      INNER JOIN craft_categorygroups cg ON c.groupId = cg.id
      WHERE e.dateDeleted IS NULL
      ORDER BY cg.name, es.slug
    `);

    console.log(`Found ${categories.length} total categories`);

    // Group by category group
    const categoriesByGroup = {};
    categories.forEach(cat => {
      const groupKey = `${cat.groupName} (${cat.groupHandle})`;
      if (!categoriesByGroup[groupKey]) {
        categoriesByGroup[groupKey] = [];
      }
      categoriesByGroup[groupKey].push(cat);
    });

    console.log('\nCategories by group:');
    Object.keys(categoriesByGroup).forEach(groupKey => {
      const cats = categoriesByGroup[groupKey];
      console.log(`\n  ${groupKey}:`);
      cats.slice(0, 10).forEach(cat => {
        console.log(`    - ${cat.slug} [ID: ${cat.id}, Site: ${cat.siteId}]`);
      });
      if (cats.length > 10) {
        console.log(`    ... and ${cats.length - 10} more`);
      }
    });

    // Look for the expected categories
    const expectedCategoryNames = ['Building', 'Opinion', 'Innovation', 'Sustainability', 'Design'];
    console.log('\n🎯 Looking for expected categories...');
    const foundExpected = categories.filter(cat =>
      expectedCategoryNames.some(name =>
        cat.slug.toLowerCase().includes(name.toLowerCase())
      )
    );

    if (foundExpected.length > 0) {
      console.log('Found matching categories:');
      foundExpected.forEach(cat => {
        console.log(`  ✓ ${cat.slug} [ID: ${cat.id}, Group: ${cat.groupName}, Site: ${cat.siteId}]`);
      });
    } else {
      console.log('⚠️  None of the expected categories found by name match');
    }

    console.log('\n🔗 Analyzing relations (article-category links)...');

    // Get all relations
    const allRelations = await query(conn, `
      SELECT
        fieldId,
        COUNT(*) as count
      FROM craft_relations
      GROUP BY fieldId
      ORDER BY count DESC
    `);

    console.log(`Found ${allRelations.length} different field IDs with relations:`);
    allRelations.slice(0, 10).forEach(r => {
      console.log(`  - Field ID ${r.fieldId}: ${r.count} relations`);
    });

    // Get relations that might be for categories (target is a category)
    const categoryRelations = await query(conn, `
      SELECT
        r.sourceId,
        r.targetId,
        r.fieldId,
        r.sortOrder,
        es.slug as categorySlug,
        c.groupId
      FROM craft_relations r
      INNER JOIN craft_categories c ON r.targetId = c.id
      INNER JOIN craft_elements_sites es ON c.id = es.elementId AND es.siteId = 1
      LIMIT 100
    `);

    console.log(`\nSample category relations (first 10):`);
    categoryRelations.slice(0, 10).forEach(r => {
      console.log(`  Article ${r.sourceId} → Category "${r.categorySlug}" (ID: ${r.targetId}) [Field: ${r.fieldId}]`);
    });

    // Find relations for siteId 9 articles specifically
    if (site9ArticleIds.length > 0) {
      const site9IdsList = site9ArticleIds.join(',');

      console.log(`\n🎯 Analyzing category relations for siteId 9 articles...`);

      const site9Relations = await query(conn, `
        SELECT
          r.sourceId,
          r.targetId,
          r.fieldId,
          r.sortOrder,
          es.slug as categorySlug,
          c.groupId,
          cg.name as groupName,
          cg.handle as groupHandle
        FROM craft_relations r
        INNER JOIN craft_categories c ON r.targetId = c.id
        INNER JOIN craft_elements_sites es ON c.id = es.elementId
        INNER JOIN craft_categorygroups cg ON c.groupId = cg.id
        WHERE r.sourceId IN (${site9IdsList})
        ORDER BY r.sourceId, r.sortOrder
      `);

      console.log(`Found ${site9Relations.length} category relations for siteId 9 articles`);

      if (site9Relations.length > 0) {
        // Count by field ID
        const byFieldId = {};
        site9Relations.forEach(r => {
          byFieldId[r.fieldId] = (byFieldId[r.fieldId] || 0) + 1;
        });

        console.log('\nRelations by field ID:');
        Object.keys(byFieldId).forEach(fieldId => {
          console.log(`  Field ${fieldId}: ${byFieldId[fieldId]} relations`);
        });

        // Count by category
        const byCategory = {};
        site9Relations.forEach(r => {
          const key = `${r.categorySlug} (${r.groupName})`;
          byCategory[key] = (byCategory[key] || 0) + 1;
        });

        console.log('\nArticle count by category:');
        Object.keys(byCategory).sort().forEach(cat => {
          console.log(`  ${cat}: ${byCategory[cat]} articles`);
        });

        // Sample mappings
        console.log('\nSample article → category mappings (first 20):');
        site9Relations.slice(0, 20).forEach(r => {
          const article = articles.find(a => a.id === parseInt(r.sourceId));
          const articleTitle = article ? article.title.substring(0, 50) : 'Unknown';
          console.log(`  "${articleTitle}" → ${r.categorySlug} (${r.groupName})`);
        });

        // Articles without categories
        const articlesWithCategories = new Set(site9Relations.map(r => parseInt(r.sourceId)));
        const articlesWithoutCategories = articles.filter(a => !articlesWithCategories.has(a.id));

        console.log(`\n📊 Coverage Statistics:`);
        console.log(`  Articles with categories: ${articlesWithCategories.size}`);
        console.log(`  Articles without categories: ${articlesWithoutCategories.length}`);

        if (articlesWithoutCategories.length > 0 && articlesWithoutCategories.length <= 20) {
          console.log('\nArticles without categories:');
          articlesWithoutCategories.forEach(a => {
            console.log(`  - ${a.title}`);
          });
        }

        // Generate report
        const report = {
          summary: {
            totalSite9Articles: articles.length,
            articlesWithCategories: articlesWithCategories.size,
            articlesWithoutCategories: articlesWithoutCategories.length,
            totalRelations: site9Relations.length
          },
          categoryGroups: categoryGroups.map(g => ({
            id: g.id.toString(),
            name: g.name,
            handle: g.handle
          })),
          categories: categories.map(c => ({
            id: c.id.toString(),
            groupId: c.groupId.toString(),
            groupName: c.groupName,
            slug: c.slug,
            siteId: c.siteId.toString()
          })),
          fieldIds: Object.keys(byFieldId).map(fieldId => ({
            fieldId: fieldId.toString(),
            relationCount: byFieldId[fieldId]
          })),
          articleCategoryMappings: site9Relations.map(r => ({
            articleId: r.sourceId.toString(),
            categoryId: r.targetId.toString(),
            categorySlug: r.categorySlug,
            groupName: r.groupName,
            fieldId: r.fieldId.toString(),
            sortOrder: r.sortOrder
          })),
          articlesWithoutCategories: articlesWithoutCategories.map(a => ({
            id: a.id,
            title: a.title,
            slug: a.slug
          }))
        };

        await fs.writeFile(OUTPUT_FILE, stringify(report, null, 2), 'utf8');
        console.log(`\n✅ Report saved to ${OUTPUT_FILE}`);

      } else {
        console.log('⚠️  No category relations found for siteId 9 articles');
        console.log('   This might mean:');
        console.log('   1. Categories are stored in a different way');
        console.log('   2. The field is stored directly in craft_content (not as relations)');
        console.log('   3. Articles genuinely have no categories assigned');
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

// Run
investigateCategories().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
