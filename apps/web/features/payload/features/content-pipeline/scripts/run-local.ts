/**
 * Zero-spend vertical slice — proves the riskiest part of the content pipeline
 * end-to-end with NO external calls (no DataForSEO, no LLM, no fal):
 *
 *   fixed Markdown  ->  valid Lexical body  ->  real draft `pages` doc (en + nl)
 *
 * Run from apps/web (the register-loaders import stubs `server-only` so the app
 * config can load under plain Node):
 *   pnpm pipeline:run-local
 *
 * Requires local Mongo running (`pnpm docker:up`).
 */

import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import { getPayloadClient } from '@/features/payload/client';
import { loadPipelineSettings } from '../payload/load-settings';
import { createArticlePage } from '../pipeline/create-article-page';

const EN_MARKDOWN = `## What is workflow automation?

Workflow automation is the practice of letting software run the repeatable steps a process needs, so people only handle the parts that need judgement. It spans the moment work arrives to the moment it is done and recorded.

### Why it matters

A reliable automated workflow keeps data accurate and the team informed. Groups that get it right tend to share a few habits:

- A single source of truth for every task
- Automated status updates across tools
- Clear ownership of exceptions

> Good automation is invisible when it works and very visible when it does not.

### Where teams get stuck

The most common failure mode is **fragmented data**: work living in spreadsheets, inboxes, and disconnected tools. Consolidating it is the first step toward automation.`;

const NL_MARKDOWN = `## Wat is workflowautomatisering?

Workflowautomatisering laat software de herhaalbare stappen van een proces uitvoeren, zodat mensen alleen de onderdelen doen die oordeel vereisen. Het loopt van het moment dat werk binnenkomt tot het is afgerond en vastgelegd.

### Waarom het belangrijk is

Een betrouwbare geautomatiseerde workflow houdt data accuraat en het team geïnformeerd. Teams die dit goed doen delen een paar gewoonten:

- Eén bron van waarheid voor elke taak
- Geautomatiseerde statusupdates over alle tools
- Duidelijk eigenaarschap van uitzonderingen

> Goede automatisering is onzichtbaar als het werkt en zeer zichtbaar als het niet werkt.`;

// Top-level await (not a fire-and-forget `main()`): `payload run` resolves the
// dynamic import of this module and then immediately calls `process.exit(0)`,
// so any un-awaited async work would be killed before it runs. Awaiting at the
// module top level keeps the import pending until the work completes.
{
    const payload = await getPayloadClient();
    const settings = await loadPipelineSettings(payload);

    const id = await createArticlePage(payload, {
        taxonomyType: settings.taxonomyType,
        content: {
            en: {
                title: 'Phase 1 test — workflow automation basics',
                excerpt:
                    'A throwaway draft proving the content-pipeline write path.',
                bodyMarkdown: EN_MARKDOWN,
                meta: {
                    title: 'Workflow automation basics',
                    description: 'Throwaway draft for pipeline verification.',
                },
            },
            nl: {
                title: 'Fase 1 test — basis van workflowautomatisering',
                excerpt:
                    'Een wegwerp-concept dat de schrijfroute van de pipeline bewijst.',
                bodyMarkdown: NL_MARKDOWN,
            },
        },
    });

    // Re-read the draft and assert the body landed in a rich-text block.
    const created = await payload.findByID({
        collection: 'pages',
        id,
        locale: I18N_DEFAULT_LOCALE,
        depth: 0,
        draft: true,
    });

    const blocks = Array.isArray(created.blocks) ? created.blocks : [];
    const firstBlock = blocks[0] as { blockType?: string } | undefined;

    console.log(
        `Created draft page ${id} (_status=${created._status}, slug=${created.slug}, taxonomyType=${created.taxonomyType}).`,
    );
    console.log(
        `Body: ${blocks.length} block(s); first block type=${firstBlock?.blockType}`,
    );

    if (firstBlock?.blockType !== 'rich-text') {
        throw new Error(
            `Expected first block to be 'rich-text', got '${firstBlock?.blockType}'.`,
        );
    }
    if (created._status !== 'draft') {
        throw new Error(`Expected _status 'draft', got '${created._status}'.`);
    }

    console.log(
        '✓ Phase 1 slice verified: valid Lexical draft page created in en + nl.',
    );
}
