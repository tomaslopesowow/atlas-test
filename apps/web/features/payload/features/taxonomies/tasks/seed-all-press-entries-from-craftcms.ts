import { PRESS_TEMPLATE_TITLE } from '@/features/payload/collections/page-templates';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { TaskConfig } from 'payload';
import * as Sentry from '@sentry/nextjs';

export const seedAllPressEntriesFromCraftCMSTask: TaskConfig<'seedAllPressEntriesFromCraftCMS'> =
    {
        slug: 'seedAllPressEntriesFromCraftCMS',
        retries: 3,
        inputSchema: [],
        onFail: ({ job }) => {
            Sentry.captureException(
                new Error('Seed all articles from CraftCMS task failed'),
                {
                    extra: {
                        job,
                    },
                },
            );
        },

        async handler({ req: { payload }, job }) {
            // Check if there is already a seedAllPressEntriesFromCraftCMS job queued; if so, do not queue again
            const existingJob = await payload.find({
                collection: 'payload-jobs',
                where: {
                    and: [
                        {
                            taskSlug: {
                                equals: 'seedAllPressEntriesFromCraftCMS',
                            },
                        },
                        {
                            id: {
                                not_equals: job.id,
                            },
                        },
                    ],
                },
            });

            if (existingJob.totalDocs > 0) {
                payload.logger.info(
                    'Sync press: seedAllPressEntriesFromCraftCMS job is already queued. Skipping reschedule.',
                );
                return {
                    output: {
                        success: true,
                    },
                };
            }

            // Find the press overview page
            const pressOverviewPage = await payload
                .findGlobal({
                    slug: 'settings',
                    depth: 0,
                })
                .then((x) => x.pages?.press);

            // If the press overview page does not exist, abort the task
            if (!pressOverviewPage) {
                throw new Error(`Press overview page does not exist.`);
            }

            // Find the Page Template for press entries (by title)
            const pageTemplate = await payload
                .find({
                    collection: 'page-templates',
                    where: {
                        title: {
                            equals: PRESS_TEMPLATE_TITLE,
                        },
                    },
                    limit: 1,
                })
                .then(({ docs }) => docs.at(0));

            // If the template does not exist, abort the task
            if (!pageTemplate) {
                throw new Error(
                    `Press page template with title ${PRESS_TEMPLATE_TITLE} not found.`,
                );
            }

            // Create stream right before consuming to avoid race conditions
            const filePath = `${process.cwd()}/seed/craftcms/press-entries.jsonl`;
            payload.logger.info(
                `Seeding CraftCMS press entries from ${filePath}`,
            );

            const input = createReadStream(filePath);
            const readLine = createInterface({ input });

            let total = 0;

            for await (const line of readLine) {
                const data = JSON.parse(line);
                total++;

                await payload.jobs.queue({
                    task: 'seedPressEntryFromCraftCMS',
                    queue: 'taxonomy-sync',
                    input: {
                        data,
                        parentPageId:
                            typeof pressOverviewPage === 'object' &&
                            'id' in pressOverviewPage
                                ? pressOverviewPage.id
                                : pressOverviewPage,
                        pageTemplateId: pageTemplate.id,
                    },
                });
            }

            payload.logger.info(
                `Finished seeding CraftCMS press entries. Total entries: ${total}`,
            );

            return {
                output: {
                    success: true,
                },
            };
        },
    };
