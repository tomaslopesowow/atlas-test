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

async function checkVimeoMetadata() {
  console.log('🔍 Checking for Vimeo metadata in database...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading tables...');
    await query(conn, `CREATE VIEW craft_assetindexdata AS SELECT * FROM read_parquet('${getParquetPath('craft_assetindexdata')}')`);
    console.log('✓ Tables loaded\n');

    // Check structure
    console.log('📋 Checking craft_assetindexdata structure...');
    const sample = await query(conn, `SELECT * FROM craft_assetindexdata LIMIT 1`);

    if (sample.length > 0) {
      console.log('Available columns:');
      Object.keys(sample[0]).forEach(col => console.log(`  - ${col}`));
      console.log('');
    }

    // Find the specific JSON asset
    console.log('🔎 Finding "Building-yachts-with-minimal-impact.json" metadata...');
    const assetData = await query(conn, `
      SELECT *
      FROM craft_assetindexdata
      WHERE uri LIKE '%Building-yachts-with-minimal-impact%'
    `);

    if (assetData.length > 0) {
      console.log('Found metadata:\n');
      assetData.forEach(data => {
        Object.keys(data).forEach(key => {
          const value = data[key];
          if (value !== null) {
            const displayValue = typeof value === 'bigint' ? value.toString() : value;
            console.log(`  ${key}: ${displayValue}`);
          }
        });
      });
    } else {
      console.log('⚠️  No metadata found in craft_assetindexdata\n');

      // Try to find any Vimeo asset metadata
      console.log('📊 Checking sample Vimeo asset metadata...');
      const sampleData = await query(conn, `
        SELECT *
        FROM craft_assetindexdata
        WHERE uri LIKE '%.json'
        LIMIT 5
      `);

      if (sampleData.length > 0) {
        console.log(`\nFound ${sampleData.length} sample JSON assets:\n`);
        sampleData.forEach((data, idx) => {
          console.log(`\n--- Asset ${idx + 1} ---`);
          Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== null) {
              const displayValue = typeof value === 'bigint' ? value.toString() : value;
              console.log(`  ${key}: ${displayValue}`);
            }
          });
        });
      } else {
        console.log('No JSON assets found in assetindexdata.');
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

checkVimeoMetadata().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
