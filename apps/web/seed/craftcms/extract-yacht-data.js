import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');
const OUTPUT_FILE = path.join(__dirname, 'yacht-data.jsonl');

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

// Main extraction function
async function extractYachtData() {
  console.log('🚀 Starting yacht data extraction...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('📖 Loading database tables into DuckDB...');

    // Create views for all tables we need
    const tables = [
      'craft_entries',
      'craft_elements',
      'craft_elements_sites',
      'craft_content',
      'craft_matrixcontent_yacht_specificationsmatrix',
      'craft_feadship_yacht_third_parties_content',
      'craft_fmc_resalebrochure',
      'craft_fmc_resaleinquiry',
      'craft_relations',
      'craft_assets',
      'craft_sections',
      'craft_matrixblocks_owners',
      'craft_matrixblocks',
      'craft_matrixblocktypes',
      'craft_matrixcontent_yacht_media',
      'craft_fields'
    ];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
      const count = await query(conn, `SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✓ ${table}: ${count[0].count} rows`);
    }

    console.log('\n🔍 Finding yacht sections...');

    // Find yacht-related sections
    const yachtSections = await query(conn, `
      SELECT id, name, handle
      FROM craft_sections
      WHERE LOWER(handle) LIKE '%yacht%'
         OR LOWER(handle) LIKE '%fleet%'
         OR LOWER(name) LIKE '%yacht%'
         OR LOWER(name) LIKE '%fleet%'
    `);

    console.log(`Found ${yachtSections.length} yacht sections:`, yachtSections.map(s => `${s.name} (${s.handle})`));

    if (yachtSections.length === 0) {
      console.log('⚠️  No yacht sections found. Showing all sections:');
      const allSections = await query(conn, 'SELECT id, name, handle FROM craft_sections');
      allSections.forEach(s => console.log(`  - ${s.name} (${s.handle})`));
    }

    const sectionIds = yachtSections.map(s => s.id).join(',');

    console.log('\n📝 Extracting yacht data...');

    // Main query to get all yacht data with joins
    const yachtsQuery = `
      SELECT
        e.id,
        e.sectionId,
        e.typeId,
        e.postDate,
        e.expiryDate,
        el.type as elementType,
        el.enabled,
        el.archived,
        el.dateCreated,
        el.dateUpdated,
        el.dateDeleted,
        es.slug,
        es.uri,
        es.siteId,
        c.title,
        c.field_yacht_hull,
        c.field_yacht_fNumber_vtaocurx,
        c.field_yacht_currentName_hwbkzdez,
        c.field_yacht_previousNames_yzegvxto,
        c.field_yacht_year,
        c.field_yacht_length,
        c.field_MMSI,
        c.field_IMO_xuyykrxe,
        c.field_yacht_showContactDetails,
        c.field_yacht_contactPersonName,
        c.field_yacht_contactPersonTitle,
        c.field_yacht_email,
        c.field_yacht_phone,
        c.field_yacht_contexts_tifhfnug,
        c.field_yacht_delivery_qvmykdyl,
        s.name as sectionName,
        s.handle as sectionHandle
      FROM craft_entries e
      INNER JOIN craft_elements el ON e.id = el.id
      LEFT JOIN craft_elements_sites es ON e.id = es.elementId
      LEFT JOIN craft_content c ON e.id = c.elementId
      LEFT JOIN craft_sections s ON e.sectionId = s.id
      WHERE e.sectionId IN (${sectionIds || '0'})
        AND el.enabled = 1
        AND el.archived = 0
        AND el.dateDeleted IS NULL
      ORDER BY e.id
    `;

    const yachts = sectionIds ? await query(conn, yachtsQuery) : [];

    console.log(`Found ${yachts.length} yachts\n`);

    // Get specifications for all yachts
    console.log('📊 Loading yacht specifications...');
    const specs = await query(conn, `
      SELECT
        elementId,
        field_specification_specification_type_gnjsztvg as type,
        field_specification_year_tpbggyuo as year,
        field_specification_yard_howhglav as yard,
        field_specification_description_owwqqhpg as description,
        field_specification_specifications_yybfhsmg as specifications,
        field_specification_guests_iczwojoj as guests,
        field_specification_extras_upzmajwu as extras,
        dateCreated,
        dateUpdated
      FROM craft_matrixcontent_yacht_specificationsmatrix
      ORDER BY elementId
    `);

    // Group specs by elementId
    const specsByYacht = new Map();
    for (const spec of specs) {
      if (!specsByYacht.has(spec.elementId)) {
        specsByYacht.set(spec.elementId, []);
      }
      specsByYacht.get(spec.elementId).push(spec);
    }

    console.log(`Loaded ${specs.length} specification records\n`);

    // Get third-party data
    console.log('🌐 Loading third-party yacht data...');
    const thirdParty = await query(conn, `
      SELECT
        yacht_id,
        source_id,
        source_type,
        content,
        status,
        dateCreated,
        dateUpdated
      FROM craft_feadship_yacht_third_parties_content
      WHERE dateDeleted IS NULL
      ORDER BY yacht_id
    `);

    const thirdPartyByYacht = new Map();
    for (const tp of thirdParty) {
      if (!thirdPartyByYacht.has(tp.yacht_id)) {
        thirdPartyByYacht.set(tp.yacht_id, []);
      }
      thirdPartyByYacht.get(tp.yacht_id).push(tp);
    }

    console.log(`Loaded ${thirdParty.length} third-party records\n`);

    // Get related assets
    console.log('🖼️  Loading related assets...');
    const relationsQuery = `
      SELECT
        r.sourceId,
        r.targetId,
        r.fieldId,
        r.sortOrder,
        a.filename,
        a.kind,
        a.alt,
        a.width,
        a.height,
        a.size,
        a.focalPoint
      FROM craft_relations r
      LEFT JOIN craft_assets a ON r.targetId = a.id
      WHERE a.id IS NOT NULL
      ORDER BY r.sourceId, r.sortOrder
    `;
    const relations = await query(conn, relationsQuery);

    const assetsByYacht = new Map();
    for (const rel of relations) {
      if (!assetsByYacht.has(rel.sourceId)) {
        assetsByYacht.set(rel.sourceId, []);
      }
      assetsByYacht.get(rel.sourceId).push({
        fieldId: rel.fieldId,
        targetId: rel.targetId,
        sortOrder: rel.sortOrder,
        filename: rel.filename,
        kind: rel.kind,
        alt: rel.alt,
        width: rel.width,
        height: rel.height,
        size: rel.size,
        focalPoint: rel.focalPoint
      });
    }

    console.log(`Loaded ${relations.length} asset relations\n`);

    // Get gallery/media data from matrix blocks
    console.log('🖼️  Loading yacht gallery data...');

    // Media block type ID is 118, with fields:
    // - imagesExterior (fieldId 1672)
    // - imagesInterior (fieldId 1671)
    // - video (fieldId 1669)
    const MEDIA_BLOCK_TYPE_ID = 118;
    const FIELD_IDS = {
      imagesExterior: 1672,
      imagesInterior: 1671,
      video: 1669
    };

    // Get all media blocks owned by yachts
    const mediaBlocksQuery = `
      SELECT
        o.ownerId as yachtId,
        o.blockId,
        o.sortOrder,
        ym.field_media_specification_type_xvqqcqja as specificationType
      FROM craft_matrixblocks_owners o
      JOIN craft_matrixblocks mb ON o.blockId = mb.id
      JOIN craft_matrixblocktypes mbt ON mb.typeId = mbt.id
      LEFT JOIN craft_matrixcontent_yacht_media ym ON o.blockId = ym.elementId
      WHERE mbt.id = ${MEDIA_BLOCK_TYPE_ID}
      ORDER BY o.ownerId, o.sortOrder
    `;
    const mediaBlocks = await query(conn, mediaBlocksQuery);

    // Group media blocks by yacht
    const mediaBlocksByYacht = new Map();
    for (const block of mediaBlocks) {
      if (!mediaBlocksByYacht.has(block.yachtId)) {
        mediaBlocksByYacht.set(block.yachtId, []);
      }
      mediaBlocksByYacht.get(block.yachtId).push(block);
    }

    // Get all assets related to media blocks
    const mediaBlockIds = mediaBlocks.map(b => b.blockId);
    let galleryAssets = [];
    if (mediaBlockIds.length > 0) {
      const galleryAssetsQuery = `
        SELECT
          r.sourceId as blockId,
          r.targetId,
          r.fieldId,
          r.sortOrder,
          a.filename,
          a.kind,
          a.alt,
          a.width,
          a.height,
          a.size,
          a.focalPoint,
          f.handle as fieldHandle
        FROM craft_relations r
        LEFT JOIN craft_assets a ON r.targetId = a.id
        LEFT JOIN craft_fields f ON r.fieldId = f.id
        WHERE r.sourceId IN (${mediaBlockIds.join(',')})
          AND a.id IS NOT NULL
        ORDER BY r.sourceId, r.sortOrder
      `;
      galleryAssets = await query(conn, galleryAssetsQuery);
    }

    // Group gallery assets by block ID
    const assetsByBlock = new Map();
    for (const asset of galleryAssets) {
      if (!assetsByBlock.has(asset.blockId)) {
        assetsByBlock.set(asset.blockId, []);
      }
      assetsByBlock.get(asset.blockId).push(asset);
    }

    // Build gallery data structure for each yacht (deduplicated by targetId)
    const galleryByYacht = new Map();
    for (const [yachtId, blocks] of mediaBlocksByYacht) {
      const seenExterior = new Set();
      const seenInterior = new Set();
      const seenVideos = new Set();

      const gallery = {
        imagesExterior: [],
        imagesInterior: [],
        videos: []
      };

      for (const block of blocks) {
        const blockAssets = assetsByBlock.get(block.blockId) || [];

        for (const asset of blockAssets) {
          const assetData = {
            targetId: asset.targetId,
            sortOrder: asset.sortOrder,
            filename: asset.filename,
            kind: asset.kind,
            alt: asset.alt,
            width: asset.width,
            height: asset.height,
            size: asset.size,
            focalPoint: asset.focalPoint,
            specificationType: block.specificationType
          };

          if (asset.fieldId === FIELD_IDS.imagesExterior && !seenExterior.has(asset.targetId)) {
            seenExterior.add(asset.targetId);
            gallery.imagesExterior.push(assetData);
          } else if (asset.fieldId === FIELD_IDS.imagesInterior && !seenInterior.has(asset.targetId)) {
            seenInterior.add(asset.targetId);
            gallery.imagesInterior.push(assetData);
          } else if (asset.fieldId === FIELD_IDS.video && !seenVideos.has(asset.targetId)) {
            seenVideos.add(asset.targetId);
            gallery.videos.push(assetData);
          }
        }
      }

      galleryByYacht.set(yachtId, gallery);
    }

    console.log(`Loaded ${mediaBlocks.length} media blocks with ${galleryAssets.length} gallery assets\n`);

    // Process yachts
    console.log('⚙️  Processing yacht data...');

    const processedYachts = yachts.map(yacht => {
      const hullNumber = yacht.field_yacht_hull || yacht.field_yacht_fNumber_vtaocurx || null;

      return {
        // IDs and metadata
        id: yacht.id,
        elementId: yacht.id,
        sectionId: yacht.sectionId,
        sectionName: yacht.sectionName,
        sectionHandle: yacht.sectionHandle,
        typeId: yacht.typeId,

        // URLs and identification
        slug: yacht.slug,
        uri: yacht.uri,
        siteId: yacht.siteId,

        // Basic yacht info
        title: yacht.title,
        currentName: yacht.field_yacht_currentName_hwbkzdez,
        previousNames: yacht.field_yacht_previousNames_yzegvxto,

        // HULL NUMBER - Primary field
        hullNumber: hullNumber,
        fNumber: yacht.field_yacht_fNumber_vtaocurx,

        // Basic specifications
        year: yacht.field_yacht_year,
        length: yacht.field_yacht_length,

        // Identification numbers
        mmsi: yacht.field_MMSI,
        imo: yacht.field_IMO_xuyykrxe,

        // Contact information
        showContactDetails: yacht.field_yacht_showContactDetails,
        contactPersonName: yacht.field_yacht_contactPersonName,
        contactPersonTitle: yacht.field_yacht_contactPersonTitle,
        email: yacht.field_yacht_email,
        phone: yacht.field_yacht_phone,

        // Context and visibility
        contexts: yacht.field_yacht_contexts_tifhfnug,

        // Dates
        postDate: yacht.postDate,
        expiryDate: yacht.expiryDate,
        delivery: yacht.field_yacht_delivery_qvmykdyl,
        dateCreated: yacht.dateCreated,
        dateUpdated: yacht.dateUpdated,

        // Detailed specifications
        specifications: (specsByYacht.get(yacht.id) || []).map(spec => ({
          type: spec.type,
          year: spec.year,
          yard: spec.yard,
          description: spec.description,
          specifications: spec.specifications,
          guests: spec.guests,
          extras: spec.extras,
          dateCreated: spec.dateCreated,
          dateUpdated: spec.dateUpdated
        })),

        // Third-party data
        thirdPartyData: (thirdPartyByYacht.get(yacht.id) || []).map(tp => ({
          sourceId: tp.source_id,
          sourceType: tp.source_type,
          content: tp.content,
          status: tp.status,
          dateCreated: tp.dateCreated,
          dateUpdated: tp.dateUpdated
        })),

        // Related assets (direct relations to yacht entry)
        relatedAssets: assetsByYacht.get(yacht.id) || [],

        // Gallery data (from media matrix blocks)
        gallery: galleryByYacht.get(yacht.id) || {
          imagesExterior: [],
          imagesInterior: [],
          videos: []
        }
      };
    });

    console.log(`✓ Processed ${processedYachts.length} yachts\n`);

    // Get resale data
    console.log('📝 Loading resale data...');

    const brochureRequests = await query(conn, `
      SELECT
        id,
        elementId,
        siteId,
        field_recipientName_dvnzamfc as recipientName,
        field_recipientEmail_jfsbqgvx as recipientEmail,
        field_subject_gvkmofid as subject,
        field_download_tccngxuz as download,
        field_firstName_aqliobuu as firstName,
        field_lastName_zzjtbpzd as lastName,
        field_emailAddress_uihrcddb as emailAddress,
        field_phone_pfhlnfjk as phone,
        dateCreated,
        dateUpdated
      FROM craft_fmc_resalebrochure
    `);

    const inquiries = await query(conn, `
      SELECT
        id,
        elementId,
        siteId,
        field_recipientName_radsekvl as recipientName,
        field_recipientEmail_nyytxvpz as recipientEmail,
        field_subject_hyepirus as subject,
        field_firstName_umlrrbod as firstName,
        field_lastName_pujkjvhr as lastName,
        field_emailAddress_hpyiasys as emailAddress,
        field_phone_cowxivgl as phone,
        field_message_urfhagoa as message,
        dateCreated,
        dateUpdated
      FROM craft_fmc_resaleinquiry
    `);

    console.log(`✓ Loaded ${brochureRequests.length} brochure requests`);
    console.log(`✓ Loaded ${inquiries.length} resale inquiries\n`);

    // Write to JSONL
    console.log(`💾 Writing to ${OUTPUT_FILE}...`);

    const yachtLines = processedYachts.map(y => stringify(y));
    const brochureLines = brochureRequests.map(b =>
      stringify({ _type: 'resale_brochure_request', ...b })
    );
    const inquiryLines = inquiries.map(i =>
      stringify({ _type: 'resale_inquiry', ...i })
    );

    const allLines = [...yachtLines, ...brochureLines, ...inquiryLines];

    await fs.writeFile(OUTPUT_FILE, allLines.join('\n'), 'utf8');

    console.log(`✅ Successfully extracted yacht data!`);
    console.log(`📄 Output file: ${OUTPUT_FILE}\n`);

    // Statistics
    console.log('📊 Statistics:');
    console.log(`  Total yachts: ${processedYachts.length}`);
    console.log(`  Yachts with hull numbers: ${processedYachts.filter(y => y.hullNumber).length}`);
    console.log(`  Yachts with specifications: ${processedYachts.filter(y => y.specifications.length > 0).length}`);
    console.log(`  Yachts with third-party data: ${processedYachts.filter(y => y.thirdPartyData.length > 0).length}`);
    console.log(`  Yachts with related assets: ${processedYachts.filter(y => y.relatedAssets.length > 0).length}`);
    console.log(`  Yachts with gallery images: ${processedYachts.filter(y => y.gallery.imagesExterior.length > 0 || y.gallery.imagesInterior.length > 0).length}`);
    console.log(`  Yachts with exterior images: ${processedYachts.filter(y => y.gallery.imagesExterior.length > 0).length}`);
    console.log(`  Yachts with interior images: ${processedYachts.filter(y => y.gallery.imagesInterior.length > 0).length}`);
    console.log(`  Yachts with videos: ${processedYachts.filter(y => y.gallery.videos.length > 0).length}`);
    console.log(`  Resale brochure requests: ${brochureRequests.length}`);
    console.log(`  Resale inquiries: ${inquiries.length}`);
    console.log(`  Total records in file: ${allLines.length}`);

    // Hull number analysis
    const hullNumbers = processedYachts.map(y => y.hullNumber).filter(Boolean);
    if (hullNumbers.length > 0) {
      console.log('\n🔢 Hull Numbers Found:');
      hullNumbers.slice(0, 30).forEach((hull, idx) => {
        const yacht = processedYachts.find(y => y.hullNumber === hull);
        console.log(`  ${idx + 1}. ${hull} - ${yacht.title || yacht.currentName || '(no name)'}`);
      });
      if (hullNumbers.length > 30) {
        console.log(`  ... and ${hullNumbers.length - 30} more`);
      }
    }

    // Sample yacht
    if (processedYachts.length > 0) {
      const sampleYacht = processedYachts.find(y => y.hullNumber) || processedYachts[0];
      console.log('\n📋 Sample yacht data:');
      console.log(stringify(sampleYacht).substring(0, 2000) + '...\n');
    }

    // Connection closes automatically

  } catch (error) {
    console.error('❌ Error during extraction:', error);
    // Connection closes automatically
    throw error;
  }
}

// Run the extraction
extractYachtData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
