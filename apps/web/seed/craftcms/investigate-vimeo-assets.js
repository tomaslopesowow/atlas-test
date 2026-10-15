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

async function investigateVimeoAssets() {
  console.log('🔍 Investigating Vimeo assets...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading tables...');
    await query(conn, `CREATE VIEW craft_assets AS SELECT * FROM read_parquet('${getParquetPath('craft_assets')}')`);
    await query(conn, `CREATE VIEW craft_volumes AS SELECT * FROM read_parquet('${getParquetPath('craft_volumes')}')`);
    console.log('✓ Tables loaded\n');

    // Find Vimeo volume
    console.log('🎬 Finding Vimeo volume...');
    const volumes = await query(conn, `
      SELECT * FROM craft_volumes WHERE handle = 'vimeo' OR name LIKE '%Vimeo%'
    `);

    if (volumes.length === 0) {
      console.log('❌ Vimeo volume not found!');
      return;
    }

    const vimeoVolumeId = volumes[0].id;
    console.log(`Found Vimeo volume ID: ${vimeoVolumeId}\n`);

    // Get all Vimeo assets
    console.log('📊 Getting all Vimeo assets...');
    const assets = await query(conn, `
      SELECT id, filename, kind, size
      FROM craft_assets
      WHERE volumeId = ${vimeoVolumeId}
      ORDER BY dateCreated DESC
      LIMIT 20
    `);

    console.log(`Found ${assets.length} Vimeo assets (showing first 20):\n`);
    assets.forEach(asset => {
      const size = typeof asset.size === 'object' && asset.size?.value
        ? asset.size.value : asset.size;
      console.log(`  - ${asset.filename} (${asset.kind}, ${size} bytes)`);
    });

    console.log('\n✨ Investigation complete!');
    console.log('\nℹ️  Note: The actual JSON files are not included in the database export.');
    console.log('   They are stored on the server filesystem and contain Vimeo video metadata.');
    console.log('   Typical Vimeo JSON structure includes: video ID, title, description, thumbnail, duration, etc.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateVimeoAssets().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
