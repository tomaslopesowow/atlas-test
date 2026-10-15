import { NEWS_TEMPLATE_TITLE } from '@/features/payload/collections/page-templates';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { TaskConfig } from 'payload';
import * as Sentry from '@sentry/nextjs';

export const seedAllArticlesFromCraftCMSTask: TaskConfig<'seedAllArticlesFromCraftCMS'> =
    {
        slug: 'seedAllArticlesFromCraftCMS',
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
            // Check if there is already a seedAllArticlesFromCraftCMS job queued; if so, do not queue again
            const existingJob = await payload.find({
                collection: 'payload-jobs',
                where: {
                    and: [
                        {
                            taskSlug: {
                                equals: 'seedAllArticlesFromCraftCMS',
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
                    'Sync fleet (dvdb): seedAllArticlesFromCraftCMS job is already queued. Skipping reschedule.',
                );
                return {
                    output: {
                        success: true,
                    },
                };
            }

            // Find the resale overview page
            const newsOverviewPage = await payload
                .findGlobal({
                    slug: 'settings',
                    depth: 0,
                })
                .then((x) => x.pages?.news);

            // If the resale overview page does not exist, abort the task
            if (!newsOverviewPage) {
                throw new Error(`News overview page does not exist.`);
            }

            // Find the Page Template for news articles (by title)
            const pageTemplate = await payload
                .find({
                    collection: 'page-templates',
                    where: {
                        title: {
                            equals: NEWS_TEMPLATE_TITLE,
                        },
                    },
                    limit: 1,
                })
                .then(({ docs }) => docs.at(0));

            // If the template does not exist, abort the task
            if (!pageTemplate) {
                throw new Error(
                    `News page template with title ${NEWS_TEMPLATE_TITLE} not found.`,
                );
            }

            // Create stream right before consuming to avoid race conditions
            const filePath = `${process.cwd()}/seed/craftcms/unique-articles.jsonl`;
            payload.logger.info(`Seeding CraftCMS articles from ${filePath}`);

            const input = createReadStream(filePath);
            const readLine = createInterface({ input });

            let total = 0;

            for await (const line of readLine) {
                const data = JSON.parse(line);
                total++;

                await payload.jobs.queue({
                    task: 'seedArticleFromCraftCMS',
                    queue: 'taxonomy-sync',
                    input: {
                        data,
                        parentPageId:
                            typeof newsOverviewPage === 'object' &&
                            'id' in newsOverviewPage
                                ? newsOverviewPage.id
                                : newsOverviewPage,
                        pageTemplateId: pageTemplate.id,
                    },
                });
            }

            payload.logger.info(
                `Finished seeding CraftCMS articles. Total articles: ${total}`,
            );

            return {
                output: {
                    success: true,
                },
            };
        },
    };
