# Feadship Data Deduplication Summary

**Date**: December 23, 2025
**Task**: Remove duplicate/revision entries from extracted data

---

## ✅ Deduplication Complete!

Successfully deduplicated both news articles and yacht data, removing Craft CMS revision history and multi-language duplicates.

---

## 📰 News Articles Deduplication

### Results
| Metric | Value |
|--------|-------|
| **Original records** | 4,033 |
| **Unique articles** | 240 |
| **Duplicates removed** | 3,793 (94.1%) |
| **Average revisions per article** | **16.8x** |

### What Was Removed
- **Craft CMS revision history**: Every time an editor saved changes, Craft created a new element record
- **Draft versions**: Multiple saves during editing sessions
- **43 articles without slugs**: Likely drafts or incomplete entries

### File Information
- **Input**: `news-articles.jsonl` (15 MB, 4,033 lines)
- **Output**: `unique-articles.jsonl` (1.5 MB, 240 lines)
- **Size reduction**: 90% smaller

### Most Revised Articles
Some articles had 50+ revisions! Top articles:

1. **54 revisions**: YETI footprint breakthrough
2. **54 revisions**: It's the Fuel, Stupid!
3. **52 revisions**: Carte Blanche
4. **52 revisions**: Fast and Curious
5. **52 revisions**: Future now: Methanol, multi-fuel systems...

### Article Distribution by Year
```
2008: 1 article
2015: 22 articles
2016: 27 articles
2017: 31 articles
2018: 31 articles
2019: 25 articles
2020: 14 articles
2021: 17 articles
2022: 13 articles
2023: 9 articles
2024: 14 articles
2025: 36 articles
```

**Date range**: August 8, 2008 → December 11, 2025

---

## 🛥️ Yacht Data Deduplication

### Results
| Metric | Value |
|--------|-------|
| **Original records** | 50,430 |
| **Unique yachts** | 1,167 |
| **Resale records (kept)** | 76 |
| **Total output records** | 1,243 |
| **Yacht duplicates removed** | 49,187 (97.7%) |
| **Average versions per yacht** | **43.1x** |

### What Was Removed
- **Multi-language entries**: Same yacht in 4+ languages (different `siteId`)
- **Revision history**: Multiple versions of each yacht entry
- **Section duplicates**: Same yacht appearing in multiple sections (Yachts, FLEET, Yacht News, etc.)

### File Information
- **Input**: `yacht-data.jsonl` (61 MB, 50,430 lines)
- **Output**: `unique-yachts.jsonl` (4.7 MB, 1,243 lines)
- **Size reduction**: 92% smaller

### Hull Number Coverage
- **543 yachts with hull numbers** (46.5% of unique yachts)
- **624 yachts without hull numbers** (concept yachts, drafts, historical entries)

### Most Revised Yachts
Some yachts had nearly 300 versions!

1. **296 versions**: Sultana (hull 598)
2. **288 versions**: Air (hull 682)
3. **284 versions**: Vassa (hull 683)
4. **280 versions**: Venus (hull 684)
5. **280 versions**: Olympia (hull 597)

### Yacht Distribution by Year (Top 10)
```
Unknown: 50 yachts
1953: 44 yachts
1938: 40 yachts
1952: 39 yachts
1955: 39 yachts
1957: 31 yachts
1960: 30 yachts
1939: 28 yachts
1937: 27 yachts
1958: 27 yachts
```

**Note**: Many historical yachts in the database!

---

## 🔧 Deduplication Strategy

### Articles
**Deduplication Key**: `slug` (unique article URL identifier)
**Selection Method**: Latest `dateUpdated` timestamp

**Logic**:
- Group all records by slug
- For each slug, keep only the version with the most recent `dateUpdated`
- Skip articles without slugs (incomplete drafts)
- Sort output by `postDate` (newest first)

### Yachts
**Deduplication Key**: Hierarchical
1. `hullNumber` (if available) - primary unique identifier
2. `slug` (if no hull number) - URL identifier
3. `id` (fallback) - Craft CMS element ID

**Selection Method**: Latest `dateUpdated` timestamp

**Special Handling**:
- Resale brochure requests (`_type: "resale_brochure_request"`) - kept as-is, not deduplicated
- Resale inquiries (`_type: "resale_inquiry"`) - kept as-is, not deduplicated

**Logic**:
- Separate resale data (not duplicates, keep all)
- Group yacht records by unique key (prefer hull number)
- Keep latest version per unique yacht
- Sort by hull number ascending, then year descending
- Append resale data at end

---

## 📁 Generated Files

### Output Files
| File | Size | Records | Description |
|------|------|---------|-------------|
| `unique-articles.jsonl` | 1.5 MB | 240 | Deduplicated news articles (latest versions) |
| `unique-yachts.jsonl` | 4.7 MB | 1,243 | Deduplicated yachts (1,167) + resale data (76) |

### Original Files (Preserved)
| File | Size | Records | Description |
|------|------|---------|-------------|
| `news-articles.jsonl` | 15 MB | 4,033 | Original extraction with all revisions |
| `yacht-data.jsonl` | 61 MB | 50,430 | Original extraction with all versions |

---

## 🚀 Usage

### Run Deduplication Again

If you need to re-run deduplication (e.g., after re-extracting data):

```bash
# Deduplicate articles
npm run deduplicate:articles

# Deduplicate yachts
npm run deduplicate:yachts

# Deduplicate both
npm run deduplicate:all
```

### Query Unique Data

**Check unique articles:**
```bash
# Count
wc -l unique-articles.jsonl

# List all titles
cat unique-articles.jsonl | jq -r '.title'

# Articles from 2025
cat unique-articles.jsonl | jq 'select(.postDate | startswith("2025"))'

# Validate JSON
cat unique-articles.jsonl | jq empty && echo "✓ Valid JSON"
```

**Check unique yachts:**
```bash
# Count
wc -l unique-yachts.jsonl

# Hull numbers only
cat unique-yachts.jsonl | jq -r 'select(._type == null) | .hullNumber' | grep -v null

# Yachts with hull numbers
cat unique-yachts.jsonl | jq 'select(.hullNumber != null)' | wc -l

# Resale data only
cat unique-yachts.jsonl | jq 'select(._type != null)'
```

---

## 🎯 Migration Recommendations

### Use These Files for Migration
✅ **Use**: `unique-articles.jsonl` (240 articles)
✅ **Use**: `unique-yachts.jsonl` (1,243 records)

❌ **Do NOT use**: `news-articles.jsonl` (4,033 - has duplicates!)
❌ **Do NOT use**: `yacht-data.jsonl` (50,430 - has duplicates!)

### Why These Files Are Better

**Cleaner data**:
- No duplicate content
- No outdated revisions
- Only latest published versions
- 92-94% smaller file sizes

**Easier migration**:
- One record per article/yacht
- No need to deduplicate in your migration code
- Faster processing (1,481 records vs 54,463)
- Clearer data relationships

**Accurate counts**:
- 240 actual articles (not 4,033)
- 1,167 actual yachts (not 50,354)
- 76 resale inquiries/requests (not mixed with yacht duplicates)

---

## 📊 Statistics Summary

### Overall Impact
| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Total records** | 54,463 | 1,481 | 97.3% |
| **File size** | 76 MB | 6.2 MB | 91.8% |
| **Articles** | 4,033 | 240 | 94.1% |
| **Yachts** | 50,354 | 1,167 | 97.7% |
| **Resale data** | 76 | 76 | 0% (kept) |

### Data Quality
- ✅ All records validated as valid JSON
- ✅ Latest versions selected by `dateUpdated`
- ✅ Hull numbers preserved (543 unique)
- ✅ Date ranges preserved (2008-2025 for articles, 1937-2028 for yachts)
- ✅ Resale data kept separate (not deduplicated)

---

## 🔍 What to Expect in Your Migration

### Articles (240 total)
- **Content**: Title, subtitle, summary, content blocks, related assets
- **Dates**: All have valid postDate (2008-2025 range)
- **URLs**: All have slugs (articles without slugs were excluded)
- **Media**: Most have related images/documents (97.9% coverage)
- **Typical use**: Blog posts, news updates, technical articles, event announcements

### Yachts (1,167 total)
- **With hull numbers**: 543 yachts (46.5%) - these are verified Feadship-built yachts
- **Without hull numbers**: 624 entries (53.5%) - concept yachts, drafts, historical entries
- **Content**: Basic info (name, year, length) + detailed specs + third-party data + images
- **Date range**: Historical (1937) to future projects (2028)
- **Typical use**: Fleet listings, yacht detail pages

### Resale Data (76 total)
- **Brochure requests**: 62 records (contact info, download requests)
- **Inquiries**: 14 records (contact info, messages)
- **Marked with**: `_type` field for easy filtering
- **Typical use**: Lead generation, sales tracking

---

## 🎉 Ready for Migration!

You now have clean, deduplicated data ready to import into your new CMS:

✅ **240 unique articles** in `unique-articles.jsonl`
✅ **1,167 unique yachts** in `unique-yachts.jsonl`
✅ **543 hull numbers** extracted and ready
✅ **76 resale records** for lead tracking
✅ **97% reduction** in duplicate data
✅ **All JSON validated** and ready to parse

**Next steps**:
1. Review sample records from unique files
2. Map fields to your new CMS schema
3. Write transformation script for your target CMS
4. Import unique data (not original files!)
5. Handle assets when 300GB archive arrives

---

**Generated**: December 23, 2025
**Original extraction**: December 14, 2025 database snapshot
**Deduplication strategy**: Latest `dateUpdated` per unique key
