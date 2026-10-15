import { DuckDBConnection } from '@duckdb/node-api';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function investigateVolumePaths() {
  console.log('🔍 Investigating CraftCMS volume configurations...\n');

  const conn = await DuckDBConnection.create();

  try {
    // Load required tables
    console.log('📖 Loading tables...');
    await query(conn, `CREATE VIEW craft_volumes AS SELECT * FROM read_parquet('${getParquetPath('craft_volumes')}')`);
    await query(conn, `CREATE VIEW craft_volumefolders AS SELECT * FROM read_parquet('${getParquetPath('craft_volumefolders')}')`);
    await query(conn, `CREATE VIEW craft_assets AS SELECT * FROM read_parquet('${getParquetPath('craft_assets')}')`);
    console.log('✓ Tables loaded\n');

    // First check available columns
    console.log('📋 Checking craft_volumes structure...');
    const sampleVol = await query(conn, `SELECT * FROM craft_volumes LIMIT 1`);
    if (sampleVol.length > 0) {
      console.log('Available columns:', Object.keys(sampleVol[0]).join(', '));
    }

    // Get all volumes with their settings
    console.log('\n📁 All Volume Configurations:');
    console.log('─'.repeat(80));
    const volumes = await query(conn, `
      SELECT *
      FROM craft_volumes
      ORDER BY id
    `);

    for (const vol of volumes) {
      console.log(`\nVolume ID: ${vol.id}`);
      // Print all non-null fields
      for (const [key, value] of Object.entries(vol)) {
        if (value !== null && key !== 'id') {
          if (key === 'settings' || key === 'fs') {
            try {
              const parsed = typeof value === 'string' ? JSON.parse(value) : value;
              console.log(`  ${key}: ${JSON.stringify(parsed, null, 4).split('\n').join('\n    ')}`);
            } catch {
              console.log(`  ${key}: ${value}`);
            }
          } else {
            const displayValue = typeof value === 'bigint' ? value.toString() : value;
            console.log(`  ${key}: ${displayValue}`);
          }
        }
      }
    }

    // Get all folders
    console.log('\n\n📂 Volume Folder Structure:');
    console.log('─'.repeat(80));
    const folders = await query(conn, `
      SELECT vf.*, v.handle as volumeHandle, v.name as volumeName
      FROM craft_volumefolders vf
      LEFT JOIN craft_volumes v ON vf.volumeId = v.id
      ORDER BY vf.volumeId, vf.path
    `);

    let currentVolume = null;
    for (const folder of folders) {
      if (folder.volumeHandle !== currentVolume) {
        currentVolume = folder.volumeHandle;
        console.log(`\n${folder.volumeHandle || folder.volumeName || 'Unknown Volume'}:`);
      }
      console.log(`  ${folder.path || '/'} (id: ${folder.id})`);
    }

    // Count assets by volume
    console.log('\n\n📊 Assets by Volume:');
    console.log('─'.repeat(80));
    const assetCounts = await query(conn, `
      SELECT
        v.handle as volumeHandle,
        v.name as volumeName,
        COUNT(a.id) as assetCount,
        COUNT(CASE WHEN a.kind = 'json' THEN 1 END) as jsonCount,
        COUNT(CASE WHEN a.kind = 'image' THEN 1 END) as imageCount
      FROM craft_assets a
      LEFT JOIN craft_volumes v ON a.volumeId = v.id
      GROUP BY v.handle, v.name
      ORDER BY assetCount DESC
    `);

    for (const row of assetCounts) {
      console.log(`\n${row.volumeName || 'Unknown'} (${row.volumeHandle}):`);
      console.log(`  Total: ${row.assetCount}`);
      console.log(`  Images: ${row.imageCount}`);
      console.log(`  JSON: ${row.jsonCount}`);
    }

    // Sample JSON assets with their volume info
    console.log('\n\n📝 Sample JSON Assets (with volume info):');
    console.log('─'.repeat(80));
    const jsonAssets = await query(conn, `
      SELECT
        a.id, a.filename, a.kind, a.folderId, a.volumeId,
        v.handle as volumeHandle, v.name as volumeName,
        vf.path as folderPath
      FROM craft_assets a
      LEFT JOIN craft_volumes v ON a.volumeId = v.id
      LEFT JOIN craft_volumefolders vf ON a.folderId = vf.id
      WHERE a.kind = 'json'
      LIMIT 10
    `);

    for (const asset of jsonAssets) {
      console.log(`\n${asset.filename}:`);
      console.log(`  Volume: ${asset.volumeHandle || asset.volumeName} (id: ${asset.volumeId})`);
      console.log(`  Folder Path: ${asset.folderPath || '/'}`);

      // Get the volume's fs settings to find the URL
      const volConfig = volumes.find(v => v.id === asset.volumeId);
      if (volConfig?.fs) {
        try {
          const fs = typeof volConfig.fs === 'string' ? JSON.parse(volConfig.fs) : volConfig.fs;
          if (fs.url) {
            const fullPath = `${fs.url}${asset.folderPath || ''}${asset.filename}`;
            console.log(`  URL: ${fullPath}`);
          }
        } catch {}
      }
    }

    console.log('\n\n✨ Investigation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.closeSync();
  }
}

investigateVolumePaths().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
