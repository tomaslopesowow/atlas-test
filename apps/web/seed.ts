import type { Payload } from 'payload';
import { createDefaultPageTemplates } from './features/payload/utils/create-default-templates';
import { createFirstUser } from './features/payload/utils/create-first-user';

export async function seed(payload: Payload) {
    await createFirstUser(payload);
    await createDefaultPageTemplates(payload);

    // Create resale overview page
    {
        const settingsResalePage = await payload
            .findGlobal({ slug: 'settings' })
            .then((x) => x.pages?.resale);

        if (!settingsResalePage) {
            payload.logger.info('Creating resale overview page...');

            let resalePage = await payload
                .find({
                    collection: 'pages',
                    where: {
                        slug: {
                            equals: 'resale',
                        },
                    },
                    limit: 1,
                })
                .then((x) => x.docs.at(0));

            resalePage ??= await payload.create({
                collection: 'pages',
                data: {
                    title: 'Resale',
                    slug: 'resale',
                    blocks: [
                        {
                            blockType: 'resale-list',
                            title: 'Resale',
                            text: 'Discover our curated selection of resale Feadships—yachts with proven pedigree, maintained to the highest standards and ready for their next owner. Explore rare opportunities to acquire a true original.',
                        },
                    ],
                },
            });

            await payload.updateGlobal({
                slug: 'settings',
                data: {
                    pages: {
                        resale: resalePage.id,
                    },
                },
            });
        }
    }

    // Create fleet catalog page
    {
        const settingsCatalogPage = await payload
            .findGlobal({ slug: 'settings' })
            .then((x) => x.pages?.fleet);

        if (!settingsCatalogPage) {
            payload.logger.info('Creating fleet catalog page...');

            let fleetCatalogPage = await payload
                .find({
                    collection: 'pages',
                    where: {
                        slug: {
                            equals: 'fleet',
                        },
                    },
                    limit: 1,
                })
                .then((x) => x.docs.at(0));

            fleetCatalogPage ??= await payload.create({
                collection: 'pages',
                data: {
                    title: 'Fleet',
                    slug: 'fleet',
                    blocks: [
                        {
                            blockType: 'fleet-overview',
                            title: {
                                root: {
                                    children: [
                                        {
                                            children: [
                                                {
                                                    detail: 0,
                                                    format: 0,
                                                    mode: 'normal',
                                                    style: '',
                                                    text: 'fleet',
                                                    type: 'text',
                                                    version: 1,

                                                    $: {
                                                        textTransform:
                                                            'uppercase',
                                                    },
                                                },
                                            ],
                                            direction: null,
                                            format: '',
                                            indent: 0,
                                            type: 'paragraph',
                                            version: 1,
                                            textFormat: 0,
                                            textStyle: '',
                                        },
                                    ],
                                    direction: null,
                                    format: '',
                                    indent: 0,
                                    type: 'root',
                                    version: 1,
                                },
                            },
                        },
                    ],
                },
            });

            await payload.updateGlobal({
                slug: 'settings',
                data: {
                    pages: {
                        fleet: fleetCatalogPage.id,
                    },
                },
            });
        }
    }

    // Create news overview page
    {
        const newsPage = await payload
            .findGlobal({ slug: 'settings' })
            .then((x) => x.pages?.news);

        const title = 'Insights';
        const slug = 'insights';

        if (!newsPage) {
            payload.logger.info('Creating news overview page...');

            let newsPage = await payload
                .find({
                    collection: 'pages',
                    where: {
                        and: [
                            {
                                slug: {
                                    equals: slug,
                                },
                            },
                            {
                                taxonomyType: {
                                    exists: false,
                                },
                            },
                            {
                                parent: {
                                    exists: false,
                                },
                            },
                        ],
                    },
                    limit: 1,
                })
                .then((x) => x.docs.at(0));

            newsPage ??= await payload.create({
                collection: 'pages',
                data: {
                    title,
                    slug,
                    blocks: [],
                },
            });

            await payload.updateGlobal({
                slug: 'settings',
                data: {
                    pages: {
                        news: newsPage.id,
                    },
                },
            });
        }
    }
}
