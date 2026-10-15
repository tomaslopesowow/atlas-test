/**
 * Seed script for populating the test Payload CMS database with pages and block fixture content.
 *
 * - Creates a "Home" page
 * - Creates a "Blocks" index page
 * - Discovers all available block types from the Payload config
 * - For each block type, dynamically imports fixtures and generates one page per fixture
 * - Pages from fixtures are children of the "Blocks" index page
 * - Logs all major operations for traceability
 */

import config from '@payload-config';
import { type BlocksField, getPayload, type Payload } from 'payload';
import type { Page } from '@/payload-types';

const LOG_PREFIX = '[seed]';

/**
 * Seeds the database with test pages and block fixture pages.
 *
 * Steps:
 * 1. Creates the home page.
 * 2. Discovers available block types from Payload config.
 * 3. For each block type, attempts to import a fixture function.
 * 4. Creates a Blocks index page.
 * 5. For each found fixture, generates a page and attaches it as a child to the Blocks page.
 * 6. Logs created pages and any errors encountered.
 */
async function seed() {
    // Initialize Payload (admin interface for Mongo/SQL DB)
    const payload = await getPayload({ config });

    // === 1. Create home page ("/") ===
    payload.logger.info(`${LOG_PREFIX} Creating home page...`);
    await payload.create({
        collection: 'pages',
        data: {
            title: 'Home',
            slug: '', // root
            _status: 'published',
        },
    });

    // === 2. Discover block types from configuration ===
    // Find the 'pages' collection config
    const pagesCollectionConfig = payload.config.collections.find(
        (collection) => collection.slug === 'pages',
    );
    // Find the 'blocks' field in the 'pages' collection (assumed to contain the block definitions)
    const pageBlocksField = pagesCollectionConfig?.flattenedFields.find(
        (field) => field.name === 'blocks',
    ) as BlocksField | undefined;
    // Extract available block type slugs
    const blockTypes = pageBlocksField?.blocks.map((block) => block.slug) ?? [];

    // === 3. Create an index page for all "Blocks" ===
    payload.logger.info(`${LOG_PREFIX} Creating blocks index page...`);
    const blocksIndexPage = await payload.create({
        collection: 'pages',
        data: {
            title: 'Blocks',
            slug: 'blocks',
            _status: 'published',
        },
    });

    // === 4. Import all available block fixtures ===
    payload.logger.info(`${LOG_PREFIX} Processing block fixtures...`);

    /**
     * Load each block fixture (if it exists).
     * A fixture exports a 'fixture' function: (payload: Payload) => Promise<Page>
     * Not all blocks have fixtures.
     */
    const blockFixtures = await Promise.all(
        blockTypes.map(async (blockType) => {
            // Try to dynamically load the fixture for this block type
            const fixture = await import(
                `../features/blocks/${blockType}.fixture.js`
            ).catch(() => {
                payload.logger.warn(
                    `${LOG_PREFIX} No fixture found for block type "${blockType}", skipping...`,
                );
                return null;
            });

            // Only return the .fixture export if it is present
            return fixture?.fixture ?? null;
        }),
    ).then((fixtures) =>
        // Only keep fixtures that are functions
        fixtures.filter(
            (fixture): fixture is (payload: Payload) => Promise<Page> =>
                fixture instanceof Function,
        ),
    );

    // === 5. Run each fixture to create a demo page (as children of the Blocks page) ===
    payload.logger.info(`${LOG_PREFIX} Creating pages from block fixtures...`);
    const blockFixturesPages = await Promise.all(
        blockFixtures.map(async (fixture) => {
            try {
                // Call the fixture function to create the initial page data
                let page = await fixture(payload);

                // Check if result is a page and it exists
                const pageExists = await payload.findByID({
                    collection: 'pages',
                    id: page.id,
                });

                if (!pageExists || page.id !== pageExists.id) {
                    payload.logger.error(
                        `${LOG_PREFIX} Fixture did not create a page: ${page.id}`,
                    );
                    return null;
                }

                // Ensure the page is a child of the Blocks index and is published
                page = await payload.update({
                    collection: 'pages',
                    id: page.id,
                    data: {
                        parent: blocksIndexPage.id,
                        _status: 'published',
                    },
                });

                payload.logger.info(
                    `${LOG_PREFIX} Created page: ${page.title}`,
                );
                return page;
            } catch (error) {
                // Log and skip any errors from fixture creation
                payload.logger.error(
                    `${LOG_PREFIX} Error creating page from fixture: ${error}`,
                );
                return null;
            }
        }),
    );

    // === 6. Final summary log ===
    payload.logger.info(`${LOG_PREFIX} Block fixtures created!`);
    payload.logger.info(
        blockFixturesPages
            .filter((page): page is Page => page != null)
            .map((page) => `${page.title} -> ${page.permalink}`),
    );
}

// Run seeding (main entrypoint)
await seed();
