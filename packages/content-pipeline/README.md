# Content pipeline (SEO)

Reusable, server-only research and generation engine for Atlas's automated SEO
content pipeline. The package owns DataForSEO integration and deterministic
keyword scoring, clustering, relevance, and similarity logic.

Payload collections, admin UI, page/media persistence, jobs, and local scripts
remain in `apps/web` and consume this package through explicit adapters.

## Development

- `pnpm --filter @repo/content-pipeline build`
- `pnpm --filter @repo/content-pipeline typecheck`
- `pnpm --filter @repo/content-pipeline test:unit`

Tests live separately from source under `tests/`.
