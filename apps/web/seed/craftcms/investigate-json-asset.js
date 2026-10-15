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

async function investigateJsonAsset() {
  console.log('🔍 Investigating "Building-yachts-with-minimal-impact.json" asset...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading craft_assets table...');
    await query(conn, `CREATE VIEW craft_assets AS SELECT * FROM read_parquet('${getParquetPath('craft_assets')}')`);
    console.log('✓ Table loaded\n');

    // Get all columns from craft_assets
    console.log('📋 Checking craft_assets structure...');
    const sample = await query(conn, `SELECT * FROM craft_assets LIMIT 1`);

    if (sample.length > 0) {
      console.log('Available columns:');
      Object.keys(sample[0]).forEach(col => console.log(`  - ${col}`));
      console.log('');
    }

    // Find the specific JSON asset
    console.log('🔎 Finding the JSON asset...');
    const assets = await query(conn, `
      SELECT *
      FROM craft_assets
      WHERE filename = 'Building-yachts-with-minimal-impact.json'
    `);

    if (assets.length === 0) {
      console.log('❌ Asset not found!');
      return;
    }

    console.log('Found asset:\n');
    const asset = assets[0];
    Object.keys(asset).forEach(key => {
      const value = asset[key];
      if (value !== null) {
        let displayValue;
        if (typeof value === 'bigint') {
          displayValue = value.toString();
        } else if (typeof value === 'object') {
          displayValue = JSON.stringify(value, (k, v) =>
            typeof v === 'bigint' ? v.toString() : v
          );
        } else {
          displayValue = value;
        }
        console.log(`  ${key}: ${displayValue}`);
      }
    });

    // Check volumes and folders
    console.log('\n📁 Checking volume and folder info...');

    await query(conn, `CREATE VIEW craft_volumes AS SELECT * FROM read_parquet('${getParquetPath('craft_volumes')}')`);
    await query(conn, `CREATE VIEW craft_volumefolders AS SELECT * FROM read_parquet('${getParquetPath('craft_volumefolders')}')`);

    const volumes = await query(conn, `
      SELECT * FROM craft_volumes WHERE id = ${asset.volumeId}
    `);

    if (volumes.length > 0) {
      console.log('\nVolume info:');
      Object.keys(volumes[0]).forEach(key => {
        const value = volumes[0][key];
        if (value !== null) {
          const displayValue = typeof value === 'bigint' ? value.toString() : value;
          console.log(`  ${key}: ${displayValue}`);
        }
      });
    }

    const folders = await query(conn, `
      SELECT * FROM craft_volumefolders WHERE id = ${asset.folderId}
    `);

    if (folders.length > 0) {
      console.log('\nFolder info:');
      Object.keys(folders[0]).forEach(key => {
        const value = folders[0][key];
        if (value !== null) {
          const displayValue = typeof value === 'bigint' ? value.toString() : value;
          console.log(`  ${key}: ${displayValue}`);
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

investigateJsonAsset().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
