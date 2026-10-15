# Feadship Data Extraction Scripts

This directory contains Node.js scripts to extract news articles and yacht data from the Feadship database dump (Parquet format).

**The required `db-export` folder is ignored by git, and should be added by the user**

## Overview

The database dump contains data exported from Feadship's Craft CMS 3 production database. The data is stored in Apache Parquet format, which is a columnar storage format commonly used for big data processing.

### Key Database Information

- **Export Date**: December 14, 2025
- **Source**: AWS RDS Snapshot (feadship-production-mysql-57)
- **Primary Database**: `feadship-craft3_prod` (Craft CMS 3)
- **Format**: Apache Parquet files (.parquet)
- **Total Tables**: 283 tables across 4 databases

## Files in This Directory

- `package.json` - Node.js project configuration
- `extract-news-articles.js` - Script to extract news/blog articles
- `extract-yacht-data.js` - Script to extract yacht data including hull numbers
- `table_schemas.txt` - Complete database schemas for reference
- `db-export/` - Directory containing the Parquet database files

## Usage

- `parquetjs` - Library to read Apache Parquet files

## Usage

### Extract News Articles

To extract all news articles with full content, relationships, and media:

```bash
pnpm extract:news
```

Or directly:

```bash
node extract-news-articles.js
```

**Output**: `news-articles.jsonl` - JSONL file with one article per line

**What's extracted:**
- Article title, subtitle, summary
- Full content blocks (text, quotes, images, galleries, forms, tables)
- Publication and event dates
- Related assets (images, documents)
- SEO settings and metadata
- URLs and slugs
- Author information
- Build post data (for build progress posts)

### Extract Yacht Data

To extract yacht specifications, hull numbers, and resale data:

```bash
npm run extract:yachts
```

Or directly:

```bash
node extract-yacht-data.js
```

**Output**: `yacht-data.jsonl` - JSONL file with one record per line

**What's extracted:**
- **Hull numbers** (primary focus) - `hullNumber` field
- F-numbers and other identifiers (MMSI, IMO)
- Yacht names (current and previous)
- Year, length, and basic specifications
- Detailed specifications from matrix table
- Third-party yacht data (from external databases)
- Contact information
- Related assets (images, brochures)
- Resale brochure requests (marked with `_type: "resale_brochure_request"`)
- Resale inquiries (marked with `_type: "resale_inquiry"`)

### Extract Everything

To run both extraction scripts in sequence:

```bash
npm run extract:all
```

## Output Format

Both scripts generate **JSONL** (JSON Lines) files. This format has one JSON object per line, which makes it:
- Easy to stream and process large datasets
- Simple to parse line-by-line
- Compatible with most data processing tools

### Reading JSONL Files

**In Node.js:**
```javascript
import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('news-articles.jsonl');
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

for await (const line of rl) {
  const article = JSON.parse(line);
  console.log(article.title, article.hullNumber);
}
```

**In Python:**
```python
import json

with open('yacht-data.jsonl', 'r') as f:
    for line in f:
        record = json.loads(line)
        print(record.get('hullNumber'))
```

**Using jq (command line):**
```bash
# Get all hull numbers
cat yacht-data.jsonl | jq -r '.hullNumber' | grep -v null

# Get article titles
cat news-articles.jsonl | jq -r '.title'

# Filter yachts with hull numbers
cat yacht-data.jsonl | jq 'select(.hullNumber != null)'
```

## Database Structure

The extraction scripts query multiple related tables from the Craft CMS database:

### For News Articles

1. **craft_entries** - Main entry records (id, sectionId, typeId, dates)
2. **craft_elements** - Element metadata (type, enabled, archived)
3. **craft_elements_sites** - Site-specific data (slug, uri)
4. **craft_content** - Field content (title, subtitle, summary, custom fields)
5. **craft_matrixcontent_post_content** - Matrix content blocks (text, quotes, images, galleries)
6. **craft_relations** - Relationships between entries and assets
7. **craft_assets** - Media files (images, documents, videos)
8. **craft_sections** - Content sections (news, blog, etc.)
9. **craft_entrytypes** - Entry type definitions

### For Yacht Data

1. **craft_entries** - Main yacht entry records
2. **craft_elements** - Element metadata
3. **craft_elements_sites** - URLs and slugs
4. **craft_content** - Yacht fields (hull, name, year, length, contact info)
5. **craft_matrixcontent_yacht_specificationsmatrix** - Detailed specifications
6. **craft_feadship_yacht_third_parties_content** - Third-party data (external databases)
7. **craft_fmc_resalebrochure** - Resale brochure requests
8. **craft_fmc_resaleinquiry** - Resale inquiry form submissions
9. **craft_relations** - Related assets and entries
10. **craft_assets** - Media files

## Data Quality Notes

### Hull Numbers

Hull numbers are extracted from multiple possible fields:
- `field_yacht_hull` - Primary hull number field
- `field_yacht_fNumber_vtaocurx` - F-number (Feadship number)

Not all yacht entries have hull numbers, as some may be:
- Placeholder entries
- Concept designs
- Decommissioned yachts
- Draft entries

### Filtering

Both scripts automatically filter out:
- Archived entries (`archived = true`)
- Disabled entries (`enabled = false`)
- Deleted entries (`dateDeleted != null`)

### Sections

The scripts intelligently identify relevant entries by section handle/name:

**News sections** include handles with: `news`, `post`, `blog`, `article`
**Yacht sections** include handles with: `yacht`, `fleet`

## Troubleshooting

### Missing Dependencies

If you see an error about missing modules:
```bash
npm install
```

### Parquet File Not Found

If you see "ENOENT: no such file or directory":
- Ensure the `db-export/` directory is in the same location as the scripts
- Check that the parquet files are extracted (not still in the zip)

### Out of Memory

If processing large datasets causes memory issues:
- Process files in batches by modifying the scripts
- Use streaming JSONL readers instead of loading everything into memory
- Increase Node.js memory: `node --max-old-space-size=4096 extract-news-articles.js`

### Empty Output

If the output file has no records:
- Check the console output for table statistics
- Verify that section names/handles match your data
- Look at the `table_schemas.txt` file to understand data structure

## Next Steps

After extraction, you can:

1. **Validate the data**
   ```bash
   # Count records
   wc -l news-articles.jsonl yacht-data.jsonl

   # Check for valid JSON
   cat news-articles.jsonl | jq empty
   ```

2. **Import to your new system**
   - Parse JSONL files
   - Map to your new data model
   - Handle relationships and asset references

3. **Analyze the data**
   - Generate statistics
   - Identify missing data
   - Check data quality

4. **Download assets**
   - Note: The 300+ GB of actual media files are being downloaded separately
   - Use asset IDs and filenames to match files when they arrive

## Testing & Validation

After migrating articles to PayloadCMS, use these recommended test articles to validate that all content block types are correctly transformed. These articles were selected from the 4,032 exported articles to provide comprehensive coverage of all block types handled in the migration.

### Recommended Test Articles

| Slug | Title | Block Types | Why It's a Good Test |
|------|-------|-------------|---------------------|
| `carte-blanche` | Carte Blanche | Text, Single Images, Videos (YouTube) | General coverage article with 7-10 blocks. Demonstrates YouTube video embeds and mixed content types. |
| `between-the-lines` | Between the Lines | Text, Vimeo Video | Dedicated Vimeo test with volumeHandle "vimeo". Tests Vimeo URL pattern matching and block creation. |
| `concept-c` | Concept C – Blending Tradition and Innovation | Tables, Text, Single Images, Multiple Images, Vimeo | Best example for table blocks (multiple tables with different styles). Also contains Vimeo video. 5-13 blocks total. |
| `fast-and-curious` | Fast and Curious | Fleet Content, Quotes, Text | Demonstrates fleet yacht references and quote blocks with citee attribution. 13 blocks total. |
| `advancing-sustainable-energy-systems-fuel-cells` | Advancing Sustainable Energy Systems: Fuel Cells | Multiple Images (Galleries), Text | Clean example of image galleries with 2+ images per block. Tests gallery layout handling. |
| `illuminee-a-new-chapter-in-feadship-concept-design` | Illuminée: A New Chapter in Feadship Concept Design | Quotes, Text, Images | Comprehensive stress test with 83 blocks. Extensive quote usage. |

### Block Type Coverage Matrix

Use this matrix to ensure all block transformation paths are tested:

| Block Type | Handler Code | Test Article(s) | Status |
|-----------|--------------|-----------------|--------|
| Text Content (`textContent`) | RichText block (HTML → Lexical) | All articles above | ✅ Universal |
| Single Image (`media.length === 1`) | MediaBlock | `carte-blanche`, `concept-c` | ✅ Covered |
| Multiple Images (`media.length > 1`) | ImageMarquee | `advancing-sustainable-energy-systems-fuel-cells`, `concept-c` | ✅ Covered |
| YouTube (`kind: 'json'`, YouTube URL) | Youtube block | `carte-blanche` | ✅ Covered |
| Vimeo (`kind: 'json'`, Vimeo URL) | Vimeo block | `between-the-lines`, `concept-c` | ✅ Covered |
| Quote (`quoteText`) | Quote block | `fast-and-curious`, `illuminee-a-new-chapter-in-feadship-concept-design` | ✅ Covered |
| Table (`tableData`) | Table block | `concept-c` | ✅ Covered |
| Fleet Content (`relatedContentFleetContext === 'fleet'`) | FleetYachtItem block | `fast-and-curious` | ✅ Covered |

### Testing Workflow

1. **Quick Validation** (4 articles, ~5 minutes)
   ```bash
   # Test core functionality with these articles
   cat news-articles.jsonl | jq 'select(.slug == "carte-blanche")'
   cat news-articles.jsonl | jq 'select(.slug == "between-the-lines")'
   cat news-articles.jsonl | jq 'select(.slug == "concept-c")'
   cat news-articles.jsonl | jq 'select(.slug == "fast-and-curious")'
   ```

2. **Comprehensive Validation** (6 articles, ~10 minutes)
   - Include all articles from the table above
   - Verify each block type renders correctly in PayloadCMS admin
   - Check frontend rendering for layout and styling

3. **Stress Test** (1 article, ~3 minutes)
   ```bash
   # Test with the largest article (83 blocks)
   cat news-articles.jsonl | jq 'select(.slug == "illuminee-a-new-chapter-in-feadship-concept-design")'
   ```

4. **Automated Testing**
   - Query PayloadCMS for migrated articles by slug
   - Verify block counts match expected values
   - Check that media upload jobs completed successfully
   - Validate that redirects were created from old CraftCMS URIs

### Testing Checklist

After migrating the test articles, verify:

- [ ] **Text blocks**: HTML correctly converted to Lexical JSON format
- [ ] **Single images**: MediaBlock created with correct path and upload queued
- [ ] **Image galleries**: ImageMarquee created with all images, correct layout settings
- [ ] **YouTube videos**: Youtube block created with valid URL
- [ ] **Vimeo videos**: Vimeo block created with valid URL
- [ ] **Quotes**: Quote block created with both quote text and citee attribution
- [ ] **Tables**: Table block created with correct header/value mapping from col1/col2
- [ ] **Fleet content**: FleetYachtItem blocks created with correct yacht slugs
- [ ] **Cover images**: Hero images uploaded to `taxonomyData.news.cover.media`
- [ ] **Categories**: CraftCMS tags correctly mapped to PayloadCMS taxonomy categories
- [ ] **Authors**: Person records created or matched correctly
- [ ] **Redirects**: 308 redirects created from old URIs to new page IDs
- [ ] **Media upload queue**: All upload jobs queued to `media-sync` queue
- [ ] **Deduplication**: Re-running migration skips existing articles

## Additional Information

### Schema Documentation

Complete table schemas are available in:
- `table_schemas.txt` - Human-readable format (generated by scripts)
- `db-export/db-export/export_tables_info_db-export_from_1_to_283.json` - Complete machine-readable format

### Database Versions

Multiple database dumps exist with different dates:
- **`feadship-craft3_prod`** (Dec 14, 2025) - **NEWEST & PRIMARY** - Use this one
- `feadshipcms-newprod` - Legacy ExpressionEngine CMS (deprecated)
- `mediahub_api_prod` - Media API database (477 MB - media metadata)
- `feadship-authorisation-server_prod` - OAuth/auth server (minimal data)

## Support

For issues or questions:
- Check the console output for detailed error messages
- Review the `table_schemas.txt` file for data structure
- Examine sample output in the console after running scripts
- Inspect the `.jsonl` files with `jq` or a text editor

## License

These extraction scripts are provided as-is for the Feadship website migration project.
