import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
import readline from 'readline';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');
const AUTHORS_FILE = path.join(__dirname, 'unique-authors.jsonl');

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
    typeof value === 'bigint' ? Number(value) : value
  );
}

// Read existing authors from JSONL
async function readAuthors() {
  const authors = [];
  const fileStream = createReadStream(AUTHORS_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      authors.push(JSON.parse(line));
    }
  }

  return authors;
}

// Main enrichment function
async function enrichAuthors() {
  console.log('Starting author enrichment...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Read existing authors
    console.log('Reading existing authors...');
    const authors = await readAuthors();
    console.log(`Found ${authors.length} authors to enrich\n`);

    const authorIds = authors.map(a => a.id);
    const authorIdsStr = authorIds.join(',');

    // Load tables
    console.log('Loading database tables into DuckDB...');
    const tables = ['craft_content', 'craft_relations', 'craft_assets'];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
      const count = await query(conn, `SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${count[0].count} rows`);
    }

    // Query author profile data from craft_content
    console.log('\nQuerying author profile data...');
    const profileQuery = `
      SELECT
        elementId,
        field_user_firstName as firstName,
        field_user_lastName as lastName,
        field_user_title as title
      FROM craft_content
      WHERE elementId IN (${authorIdsStr})
    `;
    const profiles = await query(conn, profileQuery);
    console.log(`Found profiles for ${profiles.length} authors`);

    // Create lookup map
    const profileMap = new Map();
    for (const profile of profiles) {
      profileMap.set(Number(profile.elementId), {
        firstName: profile.firstName,
        lastName: profile.lastName,
        title: profile.title
      });
    }

    // Query profile pictures
    console.log('\nQuerying profile pictures...');
    const pictureQuery = `
      SELECT
        r.sourceId,
        a.filename
      FROM craft_relations r
      LEFT JOIN craft_assets a ON r.targetId = a.id
      WHERE r.sourceId IN (${authorIdsStr})
        AND a.kind = 'image'
      ORDER BY r.sourceId, r.sortOrder
    `;
    const pictures = await query(conn, pictureQuery);
    console.log(`Found ${pictures.length} picture relations`);

    // Create picture lookup (take first image per author)
    const pictureMap = new Map();
    for (const pic of pictures) {
      const sourceId = Number(pic.sourceId);
      if (!pictureMap.has(sourceId)) {
        pictureMap.set(sourceId, pic.filename);
      }
    }

    // Enrich authors
    console.log('\nEnriching author data...');
    const enrichedAuthors = authors.map(author => {
      const profile = profileMap.get(author.id);
      const picture = pictureMap.get(author.id);

      return {
        id: author.id,
        firstName: profile?.firstName || null,
        lastName: profile?.lastName || null,
        title: profile?.title || null,
        picture: picture || null,
        firstArticleDate: author.firstArticleDate,
        lastArticleDate: author.lastArticleDate,
        articleCount: author.articleCount,
        articles: author.articles
      };
    });

    // Write enriched authors
    console.log('\nWriting enriched authors...');
    const jsonlContent = enrichedAuthors.map(a => stringify(a)).join('\n');
    await fs.writeFile(AUTHORS_FILE, jsonlContent, 'utf8');

    // Report
    console.log('\n=== Enrichment Results ===');
    for (const author of enrichedAuthors) {
      const name = [author.firstName, author.lastName].filter(Boolean).join(' ') || '(no name)';
      const title = author.title || '(no title)';
      const picture = author.picture || '(no picture)';
      console.log(`- ID ${author.id}: ${name} | ${title} | ${picture}`);
    }

    console.log(`\nSuccessfully enriched ${AUTHORS_FILE}`);

    conn.closeSync();

  } catch (error) {
    console.error('Error during enrichment:', error);
    conn.closeSync();
    throw error;
  }
}

// Run
enrichAuthors().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
