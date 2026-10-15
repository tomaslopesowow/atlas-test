import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_EXPORT_PATH = path.join(__dirname, 'db-export', 'db-export', 'feadship-craft3_prod');
const OUTPUT_FILE = path.join(__dirname, 'press-entries.jsonl');

// Press section configuration
const SECTION_ID = 5;  // Press channel section
const SITE_ID = 1;     // Feadship main site only

// Author/contact relation field ID in CraftCMS.
// fieldId 19 is the "Contact" (post_contact) field that links entries to their display/byline
// author — an Entry in the "Profiles" section (handle: contacts). This is distinct from
// craft_entries.authorId which is the CMS entry creator.
const AUTHOR_FIELD_ID = 19;

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

// Helper to convert DuckDB date object (with micros) to ISO string
function convertDateToISO(dateObj) {
  if (!dateObj) return null;
  if (typeof dateObj === 'string') return dateObj; // Already a string
  if (dateObj.micros) {
    // Convert microseconds to milliseconds
    const micros = typeof dateObj.micros === 'bigint' ? dateObj.micros : BigInt(dateObj.micros);
    const milliseconds = Number(micros / 1000n);
    return new Date(milliseconds).toISOString();
  }
  return null;
}

// Helper to convert DuckDB decimal/numeric object to number
function convertToNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  // Handle DuckDB decimal object: {width: number, scale: number, value: string}
  if (typeof value === 'object' && 'value' in value) {
    return Number(value.value);
  }
  return null;
}

// Main extraction function
async function extractPressEntries() {
  console.log('Starting press entries extraction...\n');

  const conn = await DuckDBConnection.create();

  try {
    console.log('Loading database tables into DuckDB...');

    // Create views for all tables we need
    const tables = [
      'craft_entries',
      'craft_elements',
      'craft_elements_sites',
      'craft_content',
      'craft_matrixcontent_post_content',
      'craft_matrixblocks_owners',
      'craft_relations',
      'craft_assets',
      'craft_volumes',
      'craft_sections',
      'craft_entrytypes',
      'craft_tags',
      'craft_taggroups'
    ];

    for (const table of tables) {
      const parquetPath = getParquetPath(table);
      await query(conn, `CREATE VIEW ${table} AS SELECT * FROM read_parquet('${parquetPath}')`);
      const count = await query(conn, `SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  - ${table}: ${count[0].count} rows`);
    }

    console.log('\nVerifying press section...');

    // Verify the press section exists
    const pressSection = await query(conn, `
      SELECT id, name, handle
      FROM craft_sections
      WHERE id = ${SECTION_ID}
    `);

    if (pressSection.length === 0) {
      console.log('Press section not found with ID 5. Showing all sections:');
      const allSections = await query(conn, 'SELECT id, name, handle FROM craft_sections');
      allSections.forEach(s => console.log(`  - ID ${s.id}: ${s.name} (${s.handle})`));
      return;
    }

    console.log(`Found press section: ${pressSection[0].name} (${pressSection[0].handle})\n`);

    console.log('Extracting press entries...');

    // Main query to get all press entries
    // Filter for canonical entries only (no revisions, no drafts, not deleted)
    // URI must start with 'pressroom/' to exclude old revision URIs starting with 'press/'
    const entriesQuery = `
      SELECT
        e.id,
        e.sectionId,
        e.typeId,
        e.authorId,
        e.postDate,
        e.expiryDate,
        el.type as elementType,
        el.enabled,
        el.archived,
        el.dateCreated,
        el.dateUpdated,
        el.dateDeleted,
        el.revisionId,
        el.draftId,
        es.slug,
        es.uri,
        es.siteId,
        c.title,
        c.field_post_title,
        c.field_post_subtitle,
        c.field_post_summary,
        c.field_post_event_start,
        c.field_post_event_end,
        c.field_post_location,
        c.field_post_seo_settings,
        c.field_post_canonicalUrl_boajhavb,
        c.field_post_publishableContexts,
        c.field_post_pin_sygebudo,
        c.field_post_taxonomy_btfinxac,
        c.field_post_mediaTopics,
        s.name as sectionName,
        s.handle as sectionHandle,
        et.name as typeName,
        et.handle as typeHandle
      FROM craft_entries e
      INNER JOIN craft_elements el ON e.id = el.id
      LEFT JOIN craft_elements_sites es ON e.id = es.elementId AND es.siteId = ${SITE_ID}
      LEFT JOIN craft_content c ON e.id = c.elementId AND c.siteId = ${SITE_ID}
      LEFT JOIN craft_sections s ON e.sectionId = s.id
      LEFT JOIN craft_entrytypes et ON e.typeId = et.id
      WHERE e.sectionId = ${SECTION_ID}
        AND es.siteId = ${SITE_ID}
        AND c.siteId = ${SITE_ID}
        AND el.revisionId IS NULL
        AND el.draftId IS NULL
        AND el.dateDeleted IS NULL
        AND es.uri LIKE 'pressroom/%'
        AND es.slug NOT IN (
          SELECT es2.slug
          FROM craft_entries e2
          INNER JOIN craft_elements el2 ON e2.id = el2.id
          LEFT JOIN craft_elements_sites es2 ON e2.id = es2.elementId AND es2.siteId = ${SITE_ID}
          LEFT JOIN craft_sections s2 ON e2.sectionId = s2.id
          WHERE (
            LOWER(s2.handle) LIKE '%news%'
            OR LOWER(s2.handle) LIKE '%post%'
            OR LOWER(s2.handle) LIKE '%blog%'
            OR LOWER(s2.handle) LIKE '%article%'
            OR LOWER(s2.name) LIKE '%news%'
            OR LOWER(s2.name) LIKE '%post%'
            OR LOWER(s2.name) LIKE '%blog%'
            OR LOWER(s2.name) LIKE '%article%'
          )
          AND el2.revisionId IS NULL
          AND el2.draftId IS NULL
          AND el2.dateDeleted IS NULL
          AND es2.siteId = ${SITE_ID}
        )
      ORDER BY e.postDate DESC
    `;

    const entries = await query(conn, entriesQuery);

    // Count how many press entries were excluded due to also existing in news sections
    const excludedQuery = `
      SELECT COUNT(*) as count
      FROM craft_entries e
      INNER JOIN craft_elements el ON e.id = el.id
      LEFT JOIN craft_elements_sites es ON e.id = es.elementId AND es.siteId = ${SITE_ID}
      WHERE e.sectionId = ${SECTION_ID}
        AND es.siteId = ${SITE_ID}
        AND el.revisionId IS NULL
        AND el.draftId IS NULL
        AND el.dateDeleted IS NULL
        AND es.uri LIKE 'pressroom/%'
        AND es.slug IN (
          SELECT es2.slug
          FROM craft_entries e2
          INNER JOIN craft_elements el2 ON e2.id = el2.id
          LEFT JOIN craft_elements_sites es2 ON e2.id = es2.elementId AND es2.siteId = ${SITE_ID}
          LEFT JOIN craft_sections s2 ON e2.sectionId = s2.id
          WHERE (
            LOWER(s2.handle) LIKE '%news%'
            OR LOWER(s2.handle) LIKE '%post%'
            OR LOWER(s2.handle) LIKE '%blog%'
            OR LOWER(s2.handle) LIKE '%article%'
            OR LOWER(s2.name) LIKE '%news%'
            OR LOWER(s2.name) LIKE '%post%'
            OR LOWER(s2.name) LIKE '%blog%'
            OR LOWER(s2.name) LIKE '%article%'
          )
          AND el2.revisionId IS NULL
          AND el2.draftId IS NULL
          AND el2.dateDeleted IS NULL
          AND es2.siteId = ${SITE_ID}
        )
    `;
    const excluded = await query(conn, excludedQuery);
    console.log(`Excluded ${excluded[0].count} press entries that also exist in news sections`);

    console.log(`Found ${entries.length} canonical press entries\n`);

    // Get matrix content blocks for all entries
    console.log('Loading content blocks...');
    const entryIds = entries.map(e => e.id).filter(Boolean).join(',');

    const contentBlocksQuery = entryIds ? `
      SELECT
        mbo.ownerId,
        mbo.sortOrder,
        mcp.elementId,
        mcp.siteId,
        mcp.field_text_text,
        mcp.field_quote_text,
        mcp.field_quote_citee_eccarwaq,
        mcp.field_image_align,
        mcp.field_image_fullWidth_bbycohmn,
        mcp.field_imageGallery_layoutStyle,
        mcp.field_imageGallery_gridCellSize,
        mcp.field_imageGallery_gridFittingPolicy,
        mcp.field_relatedContent_layoutType,
        mcp.field_relatedContent_fleetContext,
        mcp.field_form_formTitle,
        mcp.field_form_formDescription,
        mcp.field_table_table,
        mcp.field_table_style_kdzbwwed,
        mcp.dateCreated,
        mcp.dateUpdated
      FROM craft_matrixblocks_owners mbo
      INNER JOIN craft_matrixcontent_post_content mcp ON mbo.blockId = mcp.elementId
      WHERE mbo.ownerId IN (${entryIds})
        AND mcp.siteId = ${SITE_ID}
      ORDER BY mbo.ownerId, mbo.sortOrder
    ` : 'SELECT NULL LIMIT 0';

    const contentBlocks = entryIds ? await query(conn, contentBlocksQuery) : [];

    // Group content blocks by ownerId (entry ID)
    const blocksByEntry = new Map();
    for (const block of contentBlocks) {
      if (!blocksByEntry.has(block.ownerId)) {
        blocksByEntry.set(block.ownerId, []);
      }
      blocksByEntry.get(block.ownerId).push(block);
    }

    console.log(`Loaded ${contentBlocks.length} content blocks\n`);

    // Get media assets for matrix blocks (videos, embeds, etc.)
    console.log('Loading matrix block media...');
    const blockIds = contentBlocks.map(b => b.elementId).filter(Boolean).join(',');
    const blockMediaQuery = blockIds ? `
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
        a.dateCreated,
        a.volumeId,
        v.handle as volumeHandle
      FROM craft_relations r
      LEFT JOIN craft_assets a ON r.targetId = a.id
      LEFT JOIN craft_volumes v ON a.volumeId = v.id
      WHERE r.sourceId IN (${blockIds})
        AND a.id IS NOT NULL
      ORDER BY r.sourceId, r.sortOrder
    ` : 'SELECT NULL LIMIT 0';

    const blockMediaRelations = blockIds ? await query(conn, blockMediaQuery) : [];

    const mediaByBlock = new Map();
    for (const rel of blockMediaRelations) {
      if (!mediaByBlock.has(rel.blockId)) {
        mediaByBlock.set(rel.blockId, []);
      }
      mediaByBlock.get(rel.blockId).push({
        fieldId: rel.fieldId,
        targetId: rel.targetId,
        sortOrder: rel.sortOrder,
        filename: rel.filename,
        kind: rel.kind,
        alt: rel.alt,
        width: rel.width,
        height: rel.height,
        size: convertToNumber(rel.size),
        focalPoint: rel.focalPoint,
        dateCreated: convertDateToISO(rel.dateCreated),
        volumeId: rel.volumeId,
        volumeHandle: rel.volumeHandle
      });
    }

    console.log(`Loaded ${blockMediaRelations.length} matrix block media relations\n`);

    // Get yacht entry relations for fleet context blocks (Field ID 85 is the 'entries' field)
    console.log('Loading yacht entry relations for fleet context blocks...');
    const yachtRelationsQuery = blockIds ? `
      SELECT
        r.sourceId as blockId,
        r.targetId,
        r.fieldId,
        r.sortOrder,
        es.slug as targetSlug,
        es.uri as targetUri,
        e.typeId as targetEntryTypeId
      FROM craft_relations r
      INNER JOIN craft_entries e ON r.targetId = e.id
      INNER JOIN craft_elements_sites es ON r.targetId = es.elementId
      WHERE r.sourceId IN (${blockIds})
        AND r.fieldId = 85
        AND es.uri LIKE 'fleet/%'
      ORDER BY r.sourceId, r.sortOrder
    ` : 'SELECT NULL LIMIT 0';

    const yachtRelations = blockIds ? await query(conn, yachtRelationsQuery) : [];

    const yachtsByBlock = new Map();
    for (const rel of yachtRelations) {
      if (!yachtsByBlock.has(rel.blockId)) {
        yachtsByBlock.set(rel.blockId, []);
      }
      yachtsByBlock.get(rel.blockId).push({
        targetId: rel.targetId,
        slug: rel.targetSlug,
        uri: rel.targetUri,
        entryTypeId: rel.targetEntryTypeId,
        sortOrder: rel.sortOrder
      });
    }

    console.log(`Loaded ${yachtRelations.length} yacht entry relations\n`);

    // Get related assets
    console.log('Loading related assets...');
    const relationsQuery = entryIds ? `
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
        a.focalPoint,
        a.dateCreated
      FROM craft_relations r
      LEFT JOIN craft_assets a ON r.targetId = a.id
      WHERE r.sourceId IN (${entryIds})
        AND a.id IS NOT NULL
      ORDER BY r.sourceId, r.sortOrder
    ` : 'SELECT NULL LIMIT 0';
    const relations = entryIds ? await query(conn, relationsQuery) : [];

    const assetsByEntry = new Map();
    for (const rel of relations) {
      if (!assetsByEntry.has(rel.sourceId)) {
        assetsByEntry.set(rel.sourceId, []);
      }
      assetsByEntry.get(rel.sourceId).push({
        fieldId: rel.fieldId,
        targetId: rel.targetId,
        sortOrder: rel.sortOrder,
        filename: rel.filename,
        kind: rel.kind,
        alt: rel.alt,
        width: rel.width,
        height: rel.height,
        size: convertToNumber(rel.size),
        focalPoint: rel.focalPoint,
        dateCreated: convertDateToISO(rel.dateCreated)
      });
    }

    console.log(`Loaded ${relations.length} asset relations\n`);

    // Get related tags (Field ID 476 is post_tags)
    console.log('Loading related tags...');
    const tagsQuery = entryIds ? `
      SELECT
        r.sourceId,
        r.targetId,
        r.fieldId,
        r.sortOrder,
        tag_es.slug as tagSlug,
        t.groupId,
        tg.name as groupName,
        tg.handle as groupHandle,
        entry_es.siteId
      FROM craft_relations r
      INNER JOIN craft_tags t ON r.targetId = t.id
      INNER JOIN craft_elements el ON t.id = el.id
      INNER JOIN craft_elements_sites entry_es ON r.sourceId = entry_es.elementId
      INNER JOIN craft_elements_sites tag_es ON t.id = tag_es.elementId AND tag_es.siteId = entry_es.siteId
      INNER JOIN craft_taggroups tg ON t.groupId = tg.id
      WHERE r.sourceId IN (${entryIds})
        AND r.fieldId = 476
        AND el.dateDeleted IS NULL
        AND entry_es.siteId = ${SITE_ID}
      ORDER BY r.sourceId, r.sortOrder
    ` : 'SELECT NULL LIMIT 0';
    const tagRelations = entryIds ? await query(conn, tagsQuery) : [];

    const tagsByEntry = new Map();
    for (const tagRel of tagRelations) {
      if (!tagsByEntry.has(tagRel.sourceId)) {
        tagsByEntry.set(tagRel.sourceId, []);
      }
      tagsByEntry.get(tagRel.sourceId).push({
        tagId: tagRel.targetId,
        slug: tagRel.tagSlug,
        groupId: tagRel.groupId,
        groupName: tagRel.groupName,
        groupHandle: tagRel.groupHandle,
        sortOrder: tagRel.sortOrder
      });
    }

    console.log(`Loaded ${tagRelations.length} tag relations\n`);

    // Get entry author relations (display/byline author, not CMS entry creator)
    const authorsByEntry = new Map();
    if (AUTHOR_FIELD_ID) {
      console.log(`Loading author relations (fieldId=${AUTHOR_FIELD_ID})...`);
      const authorRelationsQuery = entryIds ? `
        SELECT
          r.sourceId as entryId,
          r.targetId as contactEntryId,
          c.title as contactTitle,
          c.field_user_firstName as firstName,
          c.field_user_lastName as lastName,
          c.field_user_role as role,
          es.slug as authorSlug
        FROM craft_relations r
        INNER JOIN craft_entries e ON r.targetId = e.id
        LEFT JOIN craft_content c ON r.targetId = c.elementId
        LEFT JOIN craft_elements_sites es ON r.targetId = es.elementId
        LEFT JOIN craft_elements el ON r.targetId = el.id
        WHERE r.sourceId IN (${entryIds})
          AND r.fieldId = ${AUTHOR_FIELD_ID}
          AND el.dateDeleted IS NULL
        ORDER BY r.sourceId, r.sortOrder
      ` : 'SELECT NULL LIMIT 0';
      const authorRelations = entryIds ? await query(conn, authorRelationsQuery) : [];

      for (const rel of authorRelations) {
        // Only keep the first author per entry (primary author)
        if (!authorsByEntry.has(rel.entryId)) {
          authorsByEntry.set(rel.entryId, {
            firstName: rel.firstName,
            lastName: rel.lastName,
            role: rel.role,
            authorSlug: rel.authorSlug,
          });
        }
      }

      console.log(`Loaded ${authorRelations.length} author relations (${authorsByEntry.size} unique entries)\n`);
    } else {
      console.log('AUTHOR_FIELD_ID not set. Skipping author relation loading.');
      console.log('Run investigate-author-relations.js to discover the correct fieldId.\n');
    }

    // Process entries
    console.log('Processing press entries...');

    const processedEntries = entries.map(entry => {
      return {
        // IDs and metadata
        id: entry.id,
        elementId: entry.id,
        sectionId: entry.sectionId,
        sectionName: entry.sectionName,
        sectionHandle: entry.sectionHandle,
        typeId: entry.typeId,
        typeName: entry.typeName,
        typeHandle: entry.typeHandle,
        authorId: entry.authorId,
        author: authorsByEntry.get(entry.id) || null,

        // URLs and identification
        slug: entry.slug,
        uri: entry.uri,
        siteId: entry.siteId,

        // Title and basic content
        title: entry.title || entry.field_post_title,
        subtitle: entry.field_post_subtitle,
        summary: entry.field_post_summary,

        // Dates
        postDate: convertDateToISO(entry.postDate),
        expiryDate: convertDateToISO(entry.expiryDate),
        dateCreated: convertDateToISO(entry.dateCreated),
        dateUpdated: convertDateToISO(entry.dateUpdated),

        // Event dates if applicable
        eventStart: convertDateToISO(entry.field_post_event_start),
        eventEnd: convertDateToISO(entry.field_post_event_end),

        // Location
        location: entry.field_post_location,

        // SEO and meta
        seoSettings: entry.field_post_seo_settings,
        canonicalUrl: entry.field_post_canonicalUrl_boajhavb,

        // Publishing contexts
        publishableContexts: entry.field_post_publishableContexts,

        // Pinning and taxonomy
        pin: entry.field_post_pin_sygebudo,
        taxonomy: entry.field_post_taxonomy_btfinxac,

        // Media topics
        mediaTopics: entry.field_post_mediaTopics,

        // Matrix content blocks (the actual post content)
        contentBlocks: (blocksByEntry.get(entry.id) || []).map(block => ({
          siteId: block.siteId,
          blockId: block.elementId,

          // Text blocks
          textContent: block.field_text_text,

          // Quote blocks
          quoteText: block.field_quote_text,
          quoteCitee: block.field_quote_citee_eccarwaq,

          // Image configuration
          imageAlign: block.field_image_align,
          imageFullWidth: block.field_image_fullWidth_bbycohmn,

          // Gallery configuration
          galleryLayoutStyle: block.field_imageGallery_layoutStyle,
          galleryGridCellSize: block.field_imageGallery_gridCellSize,
          galleryGridFittingPolicy: block.field_imageGallery_gridFittingPolicy,

          // Related content
          relatedContentLayoutType: block.field_relatedContent_layoutType,
          relatedContentFleetContext: block.field_relatedContent_fleetContext,
          relatedYachtEntries: yachtsByBlock.get(block.elementId) || [],

          // Form blocks
          formTitle: block.field_form_formTitle,
          formDescription: block.field_form_formDescription,

          // Table blocks
          tableData: block.field_table_table,
          tableStyle: block.field_table_style_kdzbwwed,

          // Media assets (videos, embeds, etc. related to this block)
          media: mediaByBlock.get(block.elementId) || [],

          // Dates
          dateCreated: convertDateToISO(block.dateCreated),
          dateUpdated: convertDateToISO(block.dateUpdated)
        })),

        // Related assets (images, videos, documents)
        relatedAssets: assetsByEntry.get(entry.id) || [],

        // Tags (themes/taxonomies)
        tags: tagsByEntry.get(entry.id) || []
      };
    });

    console.log(`Processed ${processedEntries.length} press entries\n`);

    // Write to JSONL
    console.log(`Writing to ${OUTPUT_FILE}...`);

    const jsonlContent = processedEntries.map(entry => stringify(entry)).join('\n');
    await fs.writeFile(OUTPUT_FILE, jsonlContent, 'utf8');

    console.log(`Successfully extracted press entries!`);
    console.log(`Output file: ${OUTPUT_FILE}\n`);

    // Statistics
    console.log('Statistics:');
    console.log(`  Total entries: ${processedEntries.length}`);
    console.log(`  Entries with content blocks: ${processedEntries.filter(e => e.contentBlocks.length > 0).length}`);
    console.log(`  Content blocks with media: ${processedEntries.reduce((sum, e) => sum + e.contentBlocks.filter(b => b.media.length > 0).length, 0)}`);
    console.log(`  Content blocks with yacht relations: ${processedEntries.reduce((sum, e) => sum + e.contentBlocks.filter(b => b.relatedYachtEntries && b.relatedYachtEntries.length > 0).length, 0)}`);
    console.log(`  Entries with related assets: ${processedEntries.filter(e => e.relatedAssets.length > 0).length}`);
    console.log(`  Entries with tags: ${processedEntries.filter(e => e.tags.length > 0).length}`);
    console.log(`  Entries with summaries: ${processedEntries.filter(e => e.summary).length}`);
    console.log(`  Entries with event dates: ${processedEntries.filter(e => e.eventStart).length}`);
    console.log(`  Entries with location: ${processedEntries.filter(e => e.location).length}`);
    console.log(`  Entries with display author: ${processedEntries.filter(e => e.author).length}`);

    // Sample entry
    if (processedEntries.length > 0) {
      console.log('\nSample entry (first entry):');
      console.log(stringify(processedEntries[0]).substring(0, 2000) + '...\n');
    }

    conn.closeSync();

  } catch (error) {
    console.error('Error during extraction:', error);
    conn.closeSync();
    throw error;
  }
}

// Run the extraction
extractPressEntries().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
