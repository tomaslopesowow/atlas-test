# PayloadCMS Background Tasks & Data Migration System

This document explains the architecture and patterns used for background job processing, data synchronization, and content migration in the Feadship PayloadCMS application.

## Overview

The system uses PayloadCMS's built-in job queue to orchestrate data synchronization from external sources (YATCO, De Voogt DB, CraftCMS) into PayloadCMS pages. The architecture follows a **three-tier pipeline pattern**:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SYNC TASK     │────▶│  CREATE TASK    │────▶│  UPLOAD TASK    │
│  (Orchestrator) │     │ (Page Creator)  │     │ (Media Handler) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     nightly             taxonomy-sync            media-sync
      queue                  queue                  queue
```

## Pipeline Architecture

### Tier 1: Sync Tasks (Orchestrators)

**Purpose:** Fetch all records from external APIs and queue individual creation jobs.

**Tasks:**
- `syncFleet` - Fetches yachts from De Voogt DB API
- `syncYatcoResale` - Fetches resale vessels from YATCO API

**Characteristics:**
- Run on the `nightly` queue (scheduled/periodic execution)
- Handle pagination for large datasets
- Perform job deduplication (skip if job already queued)
- Self-reschedule on success for continuous sync
- Use Effect library for sequential processing with error isolation

**Example Flow:**
```
syncFleet runs
  └─▶ Fetches 500 yachts from De Voogt DB
  └─▶ For each yacht:
        └─▶ Check if createFleetPage job exists for this yacht
        └─▶ If not, queue new createFleetPage job
```

### Tier 2: Create Tasks (Page Creators)

**Purpose:** Process individual items and create/update PayloadCMS pages.

**Tasks:**
- `createFleetPage` - Creates fleet yacht pages from De Voogt DB data
- `createResalePage` - Creates resale listing pages from YATCO data
- `seedArticleFromCraftCMS` - Migrates articles from CraftCMS export

**Characteristics:**
- Run on the `taxonomy-sync` queue
- Handle duplicate detection (skip if page exists)
- Create redirects for migrated content
- Queue media upload jobs for images/covers
- Transform external data formats to PayloadCMS schema

**Example Flow:**
```
createFleetPage runs for yacht ID "DV-123"
  └─▶ Fetch full yacht details from De Voogt DB
  └─▶ Check if page with this dvdbReferenceId exists
  └─▶ If not, create new page with taxonomyType: 'fleet'
  └─▶ Queue createUploadFromUrl for cover image
```

### Tier 3: Upload Tasks (Media Handlers)

**Purpose:** Download media from URLs and attach to target documents.

**Tasks:**
- `createUploadFromUrl` - Downloads media and updates target document

**Characteristics:**
- Run on the `media-sync` queue
- Deduplicate by source URL (reuse existing media)
- Support nested path updates (e.g., `blocks.0.items.1.media.image.media`)
- Handle various media types (images, documents)

**Example Flow:**
```
createUploadFromUrl runs for image URL
  └─▶ Check if media with this source URL exists
  └─▶ If not, fetch and create new media document
  └─▶ If target specified, update target doc at given path
```

## Queue System

### Queue Names & Purposes

| Queue | Purpose | Typical Tasks |
|-------|---------|---------------|
| `nightly` | Scheduled sync jobs that run periodically | `syncFleet`, `syncYatcoResale` |
| `taxonomy-sync` | Individual page creation/update jobs | `createFleetPage`, `createResalePage`, `seedArticleFromCraftCMS` |
| `media-sync` | Media download and attachment jobs | `createUploadFromUrl` |

### Job Configuration

All tasks share common configuration:
- **Retries:** 3 attempts on failure
- **Error Reporting:** Sentry integration via `onFail` handler
- **Input Validation:** Schema-based input validation

## Key Patterns

### 1. Job Deduplication

Sync tasks check for existing jobs before queuing to prevent duplicate processing:

```typescript
const existingJob = await payload.find({
    collection: 'payload-jobs',
    where: {
        and: [
            { taskSlug: { equals: 'createFleetPage' } },
            { 'input.dvdbReferenceId': { equals: yachtId } },
        ],
    },
});

if (existingJob.totalDocs > 0) {
    // Skip - job already queued
    return;
}
```

### 2. Page Deduplication

Create tasks check for existing pages before creating:

```typescript
const existing = await payload.find({
    collection: 'pages',
    where: {
        'taxonomyData.fleet.dvdbReferenceId': { equals: yachtId },
    },
});

if (existing.totalDocs > 0) {
    // Skip - page already exists
    return { output: { pageId: existing.docs[0].id } };
}
```

### 3. Media Source Deduplication

Upload tasks check for existing media by source URL:

```typescript
const existingMedia = await payload.find({
    collection: 'media',
    where: {
        source: { equals: url },
    },
});

if (existingMedia.docs[0]) {
    // Reuse existing media instead of re-downloading
    media = existingMedia.docs[0];
}
```

### 4. Self-Rescheduling

Sync tasks reschedule themselves on success for continuous operation:

```typescript
async onSuccess({ req: { payload }, job }) {
    // Check no other sync job is queued
    const existingJob = await payload.find({...});
    if (existingJob.totalDocs > 0) return;

    // Queue next run
    await payload.jobs.queue({
        task: 'syncFleet',
        queue: 'nightly',
        input: {},
    });
}
```

### 5. Nested Path Updates

The upload task supports updating deeply nested document fields:

```typescript
// Target path: "blocks.0.items.1.media.image.media"
// This updates: doc.blocks[0].items[1].media.image.media = mediaId

const segments = path.split('.');
let current = updateData;
segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
        current[segment] = media.id;
    } else {
        current[segment] ??= isNumber(next) ? [] : {};
        current = current[segment];
    }
});
```

### 6. Effect-based Error Isolation

Tasks use the Effect library to process items with isolated error handling:

```typescript
await Effect.all(
    items.map((item) =>
        Effect.tryPromise(async () => {
            // Process item
        }).pipe(
            Effect.catchAll((error) => {
                // Log error but continue with other items
                logger.error(error);
                return Effect.succeedNone;
            }),
        ),
    ),
).pipe(Effect.runPromise);
```

## Data Flow Examples

### Fleet Sync (De Voogt DB → PayloadCMS)

```
1. syncFleet job runs (nightly queue)
   │
2. Fetch all yachts from De Voogt DB API
   │
3. For each yacht, queue createFleetPage job (taxonomy-sync queue)
   │
4. createFleetPage job runs:
   ├─▶ Fetch full yacht details
   ├─▶ Create page with taxonomyType: 'fleet'
   └─▶ (No cover image in this flow)
   │
5. syncFleet reschedules itself for next run
```

### Resale Sync (YATCO → PayloadCMS)

```
1. syncYatcoResale job runs (nightly queue)
   │
2. Fetch all vessels via paginated YATCO API calls
   │
3. For each vessel, queue createResalePage job (taxonomy-sync queue)
   │
4. createResalePage job runs:
   ├─▶ Fetch full vessel details from YATCO
   ├─▶ Handle broker priority (Feadship vs others)
   ├─▶ Create page with taxonomyType: 'resale'
   └─▶ Queue createUploadFromUrl for cover image (media-sync queue)
   │
5. createUploadFromUrl job runs:
   ├─▶ Download image from YATCO
   ├─▶ Create media document
   └─▶ Update page.taxonomyData.resale.cover.media
   │
6. syncYatcoResale reschedules itself for next run
```

### Article Migration (CraftCMS → PayloadCMS)

```
1. seedArticleFromCraftCMS job runs (taxonomy-sync queue)
   │
2. Parse article data from CraftCMS JSON export
   │
3. Create page with taxonomyType: 'news':
   ├─▶ Map CraftCMS tags to taxonomy categories
   ├─▶ Find or create author (Person)
   ├─▶ Convert HTML content to Lexical format
   ├─▶ Transform content blocks (text, quotes, images, tables, videos)
   └─▶ Create redirect from old URI
   │
4. Queue createUploadFromUrl jobs for each media item:
   ├─▶ Cover image → taxonomyData.news.cover.media
   ├─▶ Block images → blocks.N.media.image.media
   └─▶ Gallery images → blocks.N.items.M.media.image.media
   │
5. createUploadFromUrl jobs run and update page with media references
```

## File Structure

```
apps/web/features/payload/
├── tasks/
│   ├── README.md                      # This file
│   └── create-upload-from-url.ts      # Media upload task
│
└── features/
    ├── devoogt/
    │   ├── tasks/
    │   │   ├── sync-fleet.ts          # Fleet sync orchestrator
    │   │   └── create-fleet-page.ts   # Fleet page creator
    │   └── utils/
    │       └── devoogtdb-client.ts    # De Voogt DB API client
    │
    ├── yatco/
    │   ├── tasks/
    │   │   ├── sync-yatco-resale.ts   # Resale sync orchestrator
    │   │   └── create-resale-page.ts  # Resale page creator
    │   └── utils/
    │       └── yatco-client.ts        # YATCO API client
    │
    └── taxonomies/
        └── tasks/
            └── seed-article-from-craftcms.ts  # CraftCMS migration
```

## Running Tasks Manually

Tasks can be triggered via the PayloadCMS admin panel or programmatically:

```typescript
// Queue a sync task
await payload.jobs.queue({
    task: 'syncFleet',
    queue: 'nightly',
    input: {},
});

// Queue a specific page creation
await payload.jobs.queue({
    task: 'createResalePage',
    queue: 'taxonomy-sync',
    input: {
        yatcoVesselId: '12345',
    },
});

// Queue a media upload
await payload.jobs.queue({
    task: 'createUploadFromUrl',
    queue: 'media-sync',
    input: {
        url: 'https://example.com/image.jpg',
        target: {
            collection: 'pages',
            doc: 'page-id-here',
            path: 'taxonomyData.news.cover.media',
        },
    },
});
```

## Error Handling

1. **Task-level retries:** Each task retries up to 3 times on failure
2. **Sentry reporting:** Failed jobs are reported to Sentry via `onFail`
3. **Effect isolation:** Individual item failures don't stop batch processing
4. **Graceful degradation:** Missing media/data is logged but doesn't fail the task
